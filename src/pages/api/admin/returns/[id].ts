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
import { generateCreditNotePDF, generateCreditNotePDFFromDB } from '../../../../lib/pdf/invoiceGenerator';

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
    const returnDetail = data as any;

    // Obtener datos del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', returnDetail.user_id)
      .single();

    return new Response(JSON.stringify({ ...returnDetail, customer: profile }), {
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
    const { data: returnRaw, error: fetchError } = await supabase
      .from('returns')
      .select(`
        *,
        orders (id, order_number, total)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !returnRaw) {
      return new Response(JSON.stringify({ error: 'Devolución no encontrada' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    const returnData = returnRaw as any;

    // Verificar que la devolución está en estado requested
    if (returnData.status !== 'requested') {
      return new Response(JSON.stringify({ error: `No se puede ${action === 'approve' ? 'aprobar' : 'rechazar'} una devolución en estado "${returnData.status}"` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener datos del cliente
    const { data: customerRaw } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', returnData.user_id)
      .single();

    const customer = customerRaw as any;

    if (action === 'approve') {
      // Aprobar devolución
      const { data: updated, error: updateError } = await (supabase as any)
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

      // Generar nota de crédito (factura negativa) vía RPC
      let creditNotePdf: Buffer | undefined;
      let creditNoteNumber: string | undefined;
      
      try {
        const { data: rpcResult, error: rpcError } = await (supabase as any)
          .rpc('process_return_with_credit_note', {
            p_return_id: id,
            p_refund_method: 'stripe',
            p_stripe_refund_id: null,
          });

        if (rpcError) {
          console.error('Error en RPC process_return_with_credit_note:', rpcError);
        } else if (rpcResult && rpcResult.length > 0 && rpcResult[0].success) {
          creditNoteNumber = rpcResult[0].credit_note_number;
          console.log('Nota de crédito generada:', creditNoteNumber);

          // Obtener la nota de crédito de la BD para generar el PDF
          const { data: creditNoteRaw } = await supabase
            .from('credit_notes')
            .select('*, invoices!credit_notes_original_invoice_id_fkey(invoice_number)')
            .eq('return_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const creditNote = creditNoteRaw as any;
          if (creditNote) {
            try {
              creditNotePdf = generateCreditNotePDF({
                credit_note_number: creditNote.credit_note_number,
                issue_date: creditNote.issue_date || new Date().toISOString(),
                original_invoice_number: creditNote.invoices?.invoice_number || 'N/A',
                customer_name: creditNote.customer_name,
                customer_email: creditNote.customer_email,
                customer_nif: creditNote.customer_nif,
                customer_address: creditNote.customer_address,
                items: creditNote.items || [],
                subtotal: Math.abs(creditNote.subtotal),
                tax_rate: creditNote.tax_rate || 21,
                tax_amount: Math.abs(creditNote.tax_amount),
                total: Math.abs(creditNote.total),
                reason: creditNote.reason || 'Devolución',
                refund_method: creditNote.refund_method || 'Devolución a tarjeta',
                company_name: creditNote.company_name || 'FashionMarket S.L.',
                company_nif: creditNote.company_nif || 'B12345678',
                company_address: creditNote.company_address || 'Calle Moda 123, 28001 Madrid, España',
              });
              console.log('PDF de nota de crédito generado correctamente');
            } catch (pdfError) {
              console.error('Error generando PDF de nota de crédito:', pdfError);
            }
          }
        } else {
          console.warn('RPC no generó nota de crédito:', rpcResult);
        }
      } catch (rpcCatchError) {
        console.error('Error llamando RPC:', rpcCatchError);
      }

      // Enviar email de aprobación al cliente (con PDF adjunto si existe)
      if (customer?.email) {
        await sendReturnApprovedEmail({
          customerName: customer.full_name || 'Cliente',
          customerEmail: customer.email,
          returnNumber: returnData.return_number,
          orderNumber: returnData.orders?.order_number || '',
          refundAmount: returnData.refund_amount || 0,
          reason: returnData.reason,
          adminNotes: admin_notes,
          creditNotePdf,
          creditNoteNumber,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: creditNoteNumber 
          ? `Devolución aprobada y nota de crédito ${creditNoteNumber} generada`
          : 'Devolución aprobada correctamente',
        data: updated,
        creditNoteNumber,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Rechazar devolución
      const { data: updated, error: updateError } = await (supabase as any)
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
