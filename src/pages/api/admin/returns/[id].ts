/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Admin Gestión de Devoluciones
 * GET: Obtener detalle de devolución
 * PATCH: Aprobar o rechazar una devolución (envía email al cliente)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';
import { sendReturnApprovedEmail, sendReturnRejectedEmail } from '../../../../lib/email/index';

// GET - Obtener devolución con detalles
export const GET: APIRoute = async ({ params, cookies }) => {
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        orders (
          id, order_number, total, status, payment_method, stripe_payment_intent_id,
          shipping_name, shipping_address_line1, shipping_city, shipping_postal_code
        ),
        return_items (
          *,
          order_items (product_name, size, color, quantity, unit_price, product_image)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Obtener datos del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', data.user_id)
      .single();

    return new Response(JSON.stringify({ ...data, customer: profile }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Devolución no encontrada' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH - Aprobar o rechazar devolución
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { action, admin_notes } = body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Acción no válida. Usa "approve" o "reject"' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener la devolución actual con datos del pedido
    const { data: returnData, error: fetchError } = await supabase
      .from('returns')
      .select(`
        *,
        orders (id, order_number, total)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !returnData) {
      return new Response(JSON.stringify({ error: 'Devolución no encontrada' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que la devolución está en estado requested
    if (returnData.status !== 'requested') {
      return new Response(JSON.stringify({ error: `No se puede ${action === 'approve' ? 'aprobar' : 'rechazar'} una devolución en estado "${returnData.status}"` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener datos del cliente
    const { data: customer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', returnData.user_id)
      .single();

    if (action === 'approve') {
      // Aprobar devolución
      const { data: updated, error: updateError } = await supabase
        .from('returns')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Enviar email de aprobación al cliente
      if (customer?.email) {
        await sendReturnApprovedEmail({
          customerName: customer.full_name || 'Cliente',
          customerEmail: customer.email,
          returnNumber: returnData.return_number,
          orderNumber: returnData.orders?.order_number || '',
          refundAmount: returnData.refund_amount || 0,
          reason: returnData.reason,
          adminNotes: admin_notes,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Devolución aprobada correctamente',
        data: updated,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Rechazar devolución
      const { data: updated, error: updateError } = await supabase
        .from('returns')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Enviar email de rechazo al cliente
      if (customer?.email) {
        await sendReturnRejectedEmail({
          customerName: customer.full_name || 'Cliente',
          customerEmail: customer.email,
          returnNumber: returnData.return_number,
          orderNumber: returnData.orders?.order_number || '',
          reason: returnData.reason,
          rejectionReason: admin_notes || 'La devolución no cumple con nuestras condiciones de devolución.',
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Devolución rechazada',
        data: updated,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Error updating return:', error);
    return new Response(JSON.stringify({ error: 'Error al actualizar devolución' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
