/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Cancelar Pedido
 * Llama a la RPC cancel_order_and_restore_stock para cancelación atómica
 * La RPC crea la nota de crédito, luego enviamos email con PDF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../lib/email';
import { generateCreditNotePDF } from '../../../lib/pdf/invoiceGenerator';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Debes iniciar sesión' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID de pedido requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con tokens del usuario
    // La RPC usa auth.uid() por lo que necesitamos el contexto del usuario
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Establecer sesión
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sesión inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Llamar a la RPC de cancelación atómica
    const { data, error } = await supabase.rpc('cancel_order_and_restore_stock', {
      p_order_id: order_id,
    });

    if (error) {
      console.error('RPC error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Error al cancelar el pedido' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // La RPC devuelve una tabla con success, message, order_number
    const result = data?.[0] || data;

    if (!result?.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result?.message || 'No se pudo cancelar el pedido' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del pedido y usuario para enviar email
    try {
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Obtener datos del pedido con factura asociada
      const { data: orderData } = await serviceClient
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', order_id)
        .single();
      
      // Obtener factura original
      const { data: originalInvoice } = await serviceClient
        .from('invoices')
        .select('*')
        .eq('order_id', order_id)
        .single();
      
      // Obtener la nota de crédito creada por la RPC
      const { data: creditNote } = await serviceClient
        .from('credit_notes')
        .select('*')
        .eq('order_id', order_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Obtener email del usuario
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', sessionData.user.id)
        .single();

      // Enviar email si tenemos los datos necesarios
      if (creditNote && orderData) {
        try {
          const creditNoteNumber = creditNote.credit_note_number;
          
          // Los items de la nota de crédito
          const creditNoteItems = creditNote.items || (orderData.order_items || []).map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.price,
            total: item.price * item.quantity,
            size: item.size,
            color: item.color,
          }));

          console.log('✅ Nota de crédito encontrada:', creditNoteNumber);
          
          // Generar PDF de nota de crédito
          try {
            const pdfBuffer = generateCreditNotePDF({
              credit_note_number: creditNoteNumber,
              original_invoice_number: originalInvoice?.invoice_number || orderData.order_number,
              issue_date: creditNote.issue_date || new Date().toISOString(),
              customer_name: creditNote.customer_name || originalInvoice?.customer_name || orderData.shipping_name || 'Cliente',
              customer_email: creditNote.customer_email || originalInvoice?.customer_email || profile?.email || '',
              customer_nif: creditNote.customer_nif || originalInvoice?.customer_nif,
              customer_address: creditNote.customer_address || originalInvoice?.customer_address,
              items: creditNoteItems,
              subtotal: Math.abs(creditNote.subtotal || originalInvoice?.subtotal || orderData.subtotal || 0),
              tax_rate: creditNote.tax_rate || originalInvoice?.tax_rate || 21,
              tax_amount: Math.abs(creditNote.tax_amount || originalInvoice?.tax_amount || 0),
              total: Math.abs(creditNote.total || originalInvoice?.total || orderData.total || 0),
              reason: creditNote.reason || 'Cancelación de pedido por el cliente',
              refund_method: creditNote.refund_method || 'Devolución a método de pago original',
              company_name: creditNote.company_name || originalInvoice?.company_name || 'FashionMarket S.L.',
              company_nif: creditNote.company_nif || originalInvoice?.company_nif || 'B12345678',
              company_address: creditNote.company_address || originalInvoice?.company_address || 'Calle Moda 123, 28001 Madrid',
            });

            // Enviar email simple con PDF adjunto
            const customerEmail = creditNote.customer_email || originalInvoice?.customer_email || orderData.guest_email || profile?.email;
            const customerName = creditNote.customer_name || originalInvoice?.customer_name || orderData.shipping_name || profile?.full_name || 'Cliente';
            
            if (customerEmail) {
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
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">Confirmación de cancelación</p>
      </div>
      
      <!-- Contenido -->
      <div style="padding: 30px; text-align: center;">
        <div style="width: 60px; height: 60px; background: #fef2f2; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 28px; color: #dc2626;">✕</span>
        </div>
        <h2 style="color: #1e3a5f; margin: 0 0 15px;">Pedido Cancelado</h2>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
          Estimado/a <strong>${customerName}</strong>,<br><br>
          Le confirmamos que su pedido <strong>#${orderData.order_number || result.order_number}</strong> ha sido cancelado correctamente.
        </p>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: left;">
          <p style="margin: 0 0 10px; color: #1e3a5f; font-weight: bold;">Información de reembolso:</p>
          <p style="margin: 0; color: #555;">
            El importe de <strong>${(Math.abs(creditNote.total || orderData.total) / 100).toFixed(2)} €</strong> será devuelto a su método de pago original en un plazo de 5-10 días hábiles.
          </p>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; color: #166534; font-weight: 500;">
            Adjuntamos la nota de crédito <strong>${creditNoteNumber}</strong> en formato PDF
          </p>
        </div>
        
        <p style="color: #888; font-size: 14px; margin-top: 25px;">
          Si tiene alguna consulta, puede responder a este correo electrónico.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #888; font-size: 12px;">
          © ${new Date().getFullYear()} FashionMarket - Moda masculina con estilo
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

              await sendEmail({
                to: customerEmail,
                subject: `Pedido #${orderData.order_number || result.order_number} cancelado - Nota de crédito ${creditNoteNumber}`,
                html: emailHtml,
                attachments: [{
                  filename: `NotaCredito-${creditNoteNumber}.pdf`,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                }],
              });
              console.log('✅ Email de cancelación enviado a:', customerEmail);
            } else {
              console.log('⚠️ No se encontró email del cliente para enviar notificación');
            }
          } catch (pdfError) {
            console.error('Error generating credit note PDF:', pdfError);
          }
        } catch (cnError) {
          console.error('Error processing credit note:', cnError);
        }
      } else {
        console.log('⚠️ No se encontró nota de crédito para el pedido');
      }
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // No fallar si el email no se envía
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        order_number: result.order_number,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in cancel order:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error inesperado' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
