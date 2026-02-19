/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Order API (Single)
 * Endpoint para actualizar estado de pedido
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';
import { sendOrderStatusEmail } from '../../../../lib/email/index';

// GET - Obtener un pedido
export const GET: APIRoute = async ({ params, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH - Actualizar estado del pedido
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Estado no válido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Preparar datos de actualización
    const updateData: Record<string, any> = { 
      status, 
      updated_at: new Date().toISOString() 
    };

    // Establecer timestamps específicos según el estado
    if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    // @ts-ignore - Supabase types issue
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Enviar email de notificación al cliente
    try {
      // Obtener datos del cliente
      const { data: orderWithProfile } = await supabase
        .from('orders')
        .select('order_number, profiles(full_name, email)')
        .eq('id', id)
        .single();

      if (orderWithProfile) {
        const profile = (orderWithProfile as any).profiles;
        const customerEmail = profile?.email;
        const customerName = profile?.full_name || 'Cliente';
        const orderNumber = orderWithProfile.order_number || id.slice(0, 8);

        if (customerEmail) {
          const trackingNumber = status === 'shipped' ? (body.tracking_number || data.tracking_number) : undefined;
          await sendOrderStatusEmail(customerEmail, customerName, orderNumber, status, trackingNumber);
        }
      }
    } catch (emailError) {
      // No fallar si el email no se envía, el pedido ya fue actualizado
      console.error('Error sending order status email:', emailError);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return new Response(JSON.stringify({ error: 'Error al actualizar pedido' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
