/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Cancelar Pedido
 * Cancela el pedido, crea nota de crédito y envía email con PDF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendEmail } from '../../../lib/email';
import { generateCreditNotePDF } from '../../../lib/pdf/invoiceGenerator';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || '';

export const POST: APIRoute = async ({ request, cookies }) => {
  console.log('=== INICIO CANCELACION DE PEDIDO ===');
  
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      console.log('ERROR: No hay tokens de sesion');
      return new Response(
        JSON.stringify({ success: false, error: 'Debes iniciar sesión' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body
    const body = await request.json();
    const { order_id } = body;
    console.log('Order ID recibido:', order_id);

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID de pedido requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Usar service client para todas las operaciones
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar sesión del usuario
    const userClient = createClient(supabaseUrl, import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '');
    const { data: sessionData, error: sessionError } = await userClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      console.log('ERROR: Sesion invalida');
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = sessionData.user.id;
    console.log('Usuario autenticado:', userId);

    // 1. Obtener datos del pedido
    const { data: orderData, error: orderError } = await serviceClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !orderData) {
      console.log('ERROR: Pedido no encontrado', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pedido encontrado:', orderData.order_number, 'Estado:', orderData.status);

    // Verificar permisos (dueño del pedido o admin)
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', userId)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOwner = orderData.user_id === userId;

    if (!isOwner && !isAdmin) {
      console.log('ERROR: Sin permisos para cancelar');
      return new Response(
        JSON.stringify({ success: false, error: 'No tienes permisos para cancelar este pedido' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar estado del pedido
    const cancelableStatuses = ['pending', 'paid', 'processing', 'awaiting_payment'];
    if (!cancelableStatuses.includes(orderData.status)) {
      console.log('ERROR: Estado no cancelable:', orderData.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `No se puede cancelar un pedido en estado "${orderData.status}"` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Actualizar estado del pedido a cancelado
    const { error: updateError } = await serviceClient
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    if (updateError) {
      console.log('ERROR: No se pudo actualizar el pedido', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al cancelar el pedido' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pedido marcado como cancelado');

    // ── REEMBOLSO EN STRIPE ──
    let stripeRefundId: string | null = null;
    const paymentIntentId = orderData.stripe_payment_intent_id || orderData.payment_intent_id;
    const paidStatuses = ['paid', 'processing'];
    const wasPaid = paidStatuses.includes(orderData.status);

    if (wasPaid && paymentIntentId && stripeSecretKey) {
      try {
        console.log('Procesando reembolso en Stripe para PI:', paymentIntentId);
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-01-27.acacia' as any });
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: 'requested_by_customer',
          metadata: {
            order_id: order_id,
            order_number: orderData.order_number || '',
            cancelled_by: isAdmin ? 'admin' : 'customer',
          },
        });
        stripeRefundId = refund.id;
        console.log('Reembolso Stripe creado:', refund.id, 'Estado:', refund.status, 'Importe:', refund.amount);
      } catch (stripeError: any) {
        console.error('ERROR al procesar reembolso en Stripe:', stripeError.message);
        // No bloquear la cancelación si falla Stripe
      }
    } else {
      console.log('Reembolso Stripe omitido:', !wasPaid ? 'pedido no pagado' : !paymentIntentId ? 'sin payment_intent' : 'sin clave Stripe');
    }

    // 3. Obtener factura original
    const { data: originalInvoice } = await serviceClient
      .from('invoices')
      .select('*')
      .eq('order_id', order_id)
      .single();

    console.log('Factura original:', originalInvoice?.invoice_number || 'No encontrada');

    // Actualizar factura si existe
    if (originalInvoice) {
      await serviceClient
        .from('invoices')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', originalInvoice.id);
    }

    // 4. Verificar si ya existe nota de crédito
    let { data: creditNote } = await serviceClient
      .from('credit_notes')
      .select('*')
      .eq('order_id', order_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('Nota de credito existente:', creditNote?.credit_note_number || 'No existe');

    // 5. Crear nota de crédito si no existe
    if (!creditNote) {
      console.log('Creando nota de credito manualmente...');
      
      const year = new Date().getFullYear();
      const { count } = await serviceClient
        .from('credit_notes')
        .select('*', { count: 'exact', head: true })
        .like('credit_note_number', `FR-${year}-%`);
      
      const seq = (count || 0) + 1;
      const frLetter = String.fromCharCode(65 + Math.floor((seq - 1) / 99999));
      const frDigits = ((seq - 1) % 99999) + 1;
      const creditNoteNumber = `FR-${year}-${frLetter}${String(frDigits).padStart(5, '0')}`;
      
      const creditNoteItems = (orderData.order_items || []).map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.price * item.quantity,
        size: item.size,
        color: item.color,
      }));

      const customerEmail = originalInvoice?.customer_email || orderData.guest_email || profile?.email || '';
      const customerName = originalInvoice?.customer_name || orderData.shipping_name || profile?.full_name || 'Cliente';

      const { data: newCreditNote, error: cnError } = await serviceClient
        .from('credit_notes')
        .insert({
          order_id,
          original_invoice_id: originalInvoice?.id || null,
          credit_note_number: creditNoteNumber,
          user_id: orderData.user_id || userId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_nif: originalInvoice?.customer_nif || null,
          customer_address: originalInvoice?.customer_address || null,
          subtotal: -Math.abs(originalInvoice?.subtotal || orderData.subtotal || 0),
          tax_rate: originalInvoice?.tax_rate || 21,
          tax_amount: -Math.abs(originalInvoice?.tax_amount || orderData.tax || 0),
          total: -Math.abs(originalInvoice?.total || orderData.total || 0),
          reason: 'Cancelación de pedido por el cliente',
          refund_method: stripeRefundId ? 'stripe' : 'Devolución a método de pago original',
          stripe_refund_id: stripeRefundId,
          items: creditNoteItems,
          status: 'pending',
        })
        .select()
        .single();

      if (cnError) {
        console.log('ERROR creando nota de credito:', cnError.message);
      } else {
        creditNote = newCreditNote;
        console.log('Nota de credito creada:', creditNoteNumber);
      }
    }

    // 6. Restaurar stock
    console.log('Restaurando stock...');
    for (const item of (orderData.order_items || [])) {
      if (item.product_id) {
        try {
          // Intentar usar RPC
          await serviceClient.rpc('increment_variant_stock', {
            p_product_id: item.product_id,
            p_size: item.size,
            p_color: item.color,
            p_quantity: item.quantity
          });
          console.log(`Stock restaurado: ${item.product_name} +${item.quantity}`);
        } catch (stockError) {
          console.log(`RPC de stock fallo para ${item.product_name}, intentando manualmente...`);
          // Fallback: actualizar directamente
          const { data: variant } = await serviceClient
            .from('product_variant_stock')
            .select('stock')
            .eq('product_id', item.product_id)
            .eq('size', item.size)
            .eq('color', item.color)
            .single();

          if (variant) {
            await serviceClient
              .from('product_variant_stock')
              .update({ stock: variant.stock + item.quantity })
              .eq('product_id', item.product_id)
              .eq('size', item.size)
              .eq('color', item.color);
          }
        }
      }
    }

    // 7. Enviar email de confirmación de cancelación
    if (creditNote) {
      console.log('Preparando email de cancelacion...');
      
      const customerEmail = creditNote.customer_email || originalInvoice?.customer_email || orderData.guest_email || profile?.email;
      const customerName = creditNote.customer_name || originalInvoice?.customer_name || orderData.shipping_name || profile?.full_name || 'Cliente';

      console.log('Email destino:', customerEmail);
      console.log('Nombre cliente:', customerName);

      if (customerEmail && customerEmail !== 'sin-email@fashionmarket.com') {
        try {
          // Generar PDF de nota de crédito
          const pdfBuffer = generateCreditNotePDF({
            credit_note_number: creditNote.credit_note_number,
            original_invoice_number: originalInvoice?.invoice_number || orderData.order_number,
            issue_date: creditNote.issue_date || new Date().toISOString(),
            customer_name: customerName,
            customer_email: customerEmail,
            customer_nif: creditNote.customer_nif || originalInvoice?.customer_nif,
            customer_address: creditNote.customer_address || originalInvoice?.customer_address,
            items: creditNote.items || [],
            subtotal: Math.abs(creditNote.subtotal || 0),
            tax_rate: creditNote.tax_rate || 21,
            tax_amount: Math.abs(creditNote.tax_amount || 0),
            total: Math.abs(creditNote.total || orderData.total || 0),
            reason: creditNote.reason || 'Cancelación de pedido por el cliente',
            refund_method: creditNote.refund_method || 'Devolución a método de pago original',
            company_name: 'FashionMarket S.L.',
            company_nif: 'B12345678',
            company_address: 'Calle Moda 123, 28001 Madrid',
          });

          console.log('PDF generado:', pdfBuffer.length, 'bytes');

          // HTML del email
          const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background: #1e3a5f; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Fashion<span style="color: #c9a227;">Market</span></h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">Confirmacion de cancelacion</p>
      </div>
      
      <!-- Contenido -->
      <div style="padding: 30px; text-align: center;">
        <table align="center" style="margin: 0 auto 20px;">
          <tr>
            <td style="width: 60px; height: 60px; background: #fef2f2; border-radius: 50%; text-align: center; vertical-align: middle;">
              <span style="font-size: 24px; color: #dc2626; font-weight: bold; line-height: 60px;">X</span>
            </td>
          </tr>
        </table>
        <h2 style="color: #1e3a5f; margin: 0 0 15px;">Pedido Cancelado</h2>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
          Estimado/a <strong>${customerName}</strong>,<br><br>
          Le confirmamos que su pedido <strong>#${orderData.order_number}</strong> ha sido cancelado correctamente.
        </p>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: left;">
          <p style="margin: 0 0 10px; color: #1e3a5f; font-weight: bold;">Informacion de reembolso:</p>
          <p style="margin: 0; color: #555;">
            El importe de <strong>${(Math.abs(creditNote.total || orderData.total) / 100).toFixed(2)} EUR</strong> sera devuelto a su metodo de pago original en un plazo de 5-10 dias habiles.
          </p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; color: #166534; font-weight: 500;">
            Adjuntamos la factura rectificativa <strong>${creditNote.credit_note_number}</strong> en formato PDF
          </p>
        </div>
        
        <p style="color: #888; font-size: 14px; margin-top: 25px;">
          Si tiene alguna consulta, puede responder a este correo electronico.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #888; font-size: 12px;">
          FashionMarket - Moda masculina con estilo
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

          // Enviar email
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: `Pedido #${orderData.order_number} cancelado - Factura rectificativa ${creditNote.credit_note_number}`,
            html: emailHtml,
            attachments: [{
              filename: `FacturaRectificativa-${creditNote.credit_note_number}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            }],
          });
          
          console.log('Email enviado exitosamente:', emailResult);
        } catch (emailError: any) {
          console.error('ERROR al enviar email:', emailError.message);
          console.error('Stack:', emailError.stack);
        }
      } else {
        console.log('AVISO: No se encontro email del cliente, no se envia notificacion');
      }
    } else {
      console.log('AVISO: No hay nota de credito, no se envia email');
    }

    console.log('=== CANCELACION COMPLETADA ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pedido cancelado correctamente. El stock ha sido restaurado.',
        order_number: orderData.order_number,
        credit_note_number: creditNote?.credit_note_number,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('ERROR INESPERADO en cancel order:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: 'Error inesperado: ' + error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
