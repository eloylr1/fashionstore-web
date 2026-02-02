/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Cancelar Pedido
 * Llama a la RPC cancel_order_and_restore_stock para cancelación atómica
 * Crea nota de crédito para la cancelación
 * Envía email de confirmación de cancelación
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../lib/email';
import { generateCreditNotePDF } from '../../../lib/pdf/invoiceGenerator';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Genera número de nota de crédito
 * Formato: NC-YYYY-XXXXXX
 */
async function generateCreditNoteNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('credit_notes')
    .select('*', { count: 'exact', head: true })
    .ilike('credit_note_number', `NC-${year}-%`);
  
  return `NC-${year}-${String((count || 0) + 1).padStart(6, '0')}`;
}

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
      
      // Obtener email del usuario
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', sessionData.user.id)
        .single();

      // Crear nota de crédito si existe factura original
      if (originalInvoice && orderData) {
        try {
          const creditNoteNumber = await generateCreditNoteNumber(serviceClient);
          
          // Los items de la nota de crédito (con valores negativos)
          const creditNoteItems = (orderData.order_items || []).map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.price,
            total: item.price * item.quantity,
            size: item.size,
            color: item.color,
          }));

          // Crear nota de crédito
          const { error: creditNoteError } = await serviceClient
            .from('credit_notes')
            .insert({
              original_invoice_id: originalInvoice.id,
              order_id: order_id,
              user_id: sessionData.user.id,
              credit_note_number: creditNoteNumber,
              customer_name: originalInvoice.customer_name,
              customer_email: originalInvoice.customer_email,
              customer_nif: originalInvoice.customer_nif,
              customer_address: originalInvoice.customer_address,
              items: creditNoteItems,
              subtotal: -originalInvoice.subtotal, // Negativo
              tax_rate: originalInvoice.tax_rate,
              tax_amount: -originalInvoice.tax_amount, // Negativo
              total: -originalInvoice.total, // Negativo
              reason: 'Cancelación de pedido por el cliente',
              refund_method: 'Devolución a tarjeta original',
              company_name: originalInvoice.company_name,
              company_nif: originalInvoice.company_nif,
              company_address: originalInvoice.company_address,
              issue_date: new Date().toISOString(),
            });

          if (creditNoteError) {
            console.error('Error creating credit note:', creditNoteError);
          } else {
            console.log('✅ Credit note created:', creditNoteNumber);
            
            // Generar PDF de nota de crédito
            try {
              const pdfBuffer = generateCreditNotePDF({
                credit_note_number: creditNoteNumber,
                original_invoice_number: originalInvoice.invoice_number,
                issue_date: new Date().toISOString(),
                customer_name: originalInvoice.customer_name,
                customer_email: originalInvoice.customer_email || profile?.email || '',
                customer_nif: originalInvoice.customer_nif,
                customer_address: originalInvoice.customer_address,
                items: creditNoteItems,
                subtotal: Math.abs(originalInvoice.subtotal),
                tax_rate: originalInvoice.tax_rate,
                tax_amount: Math.abs(originalInvoice.tax_amount),
                total: Math.abs(originalInvoice.total),
                reason: 'Cancelación de pedido por el cliente',
                refund_method: 'Devolución a método de pago original',
                company_name: originalInvoice.company_name || 'FashionMarket S.L.',
                company_nif: originalInvoice.company_nif || 'B12345678',
                company_address: originalInvoice.company_address || 'Calle Moda 123, 28001 Madrid',
              });

              // Enviar email simple con PDF adjunto
              const customerEmail = originalInvoice.customer_email || profile?.email;
              const customerName = originalInvoice.customer_name || profile?.full_name || 'Cliente';
              
              if (customerEmail) {
                const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background: #991b1b; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Fashion<span style="color: #fca5a5;">Market</span></h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">Confirmación de cancelación</p>
      </div>
      
      <!-- Contenido -->
      <div style="padding: 30px; text-align: center;">
        <div style="font-size: 60px; margin-bottom: 20px;">❌</div>
        <h2 style="color: #991b1b; margin: 0 0 15px;">Pedido Cancelado</h2>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
          Hola <strong>${customerName}</strong>,<br><br>
          Tu pedido <strong>#${orderData.order_number || result.order_number}</strong> ha sido cancelado correctamente.
        </p>
        
        <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: left;">
          <p style="margin: 0 0 10px; color: #991b1b; font-weight: bold;">💰 Información de reembolso:</p>
          <p style="margin: 0; color: #555;">
            El importe será devuelto a tu método de pago original en un plazo de 5-10 días hábiles.
          </p>
        </div>
        
        <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; color: #059669; font-weight: 500;">
            📎 Adjuntamos la nota de crédito en formato PDF
          </p>
        </div>
        
        <p style="color: #888; font-size: 14px; margin-top: 25px;">
          Si tienes alguna pregunta, responde a este email.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #888; font-size: 12px;">
          © ${new Date().getFullYear()} FashionMarket · Moda masculina con estilo
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

                await sendEmail({
                  to: customerEmail,
                  subject: `❌ Pedido #${orderData.order_number || result.order_number} cancelado - Nota de crédito ${creditNoteNumber}`,
                  html: emailHtml,
                  attachments: [{
                    filename: `NotaCredito-${creditNoteNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                  }],
                });
                console.log('✅ Email de cancelación enviado con PDF adjunto');
              }
            } catch (pdfError) {
              console.error('Error generating credit note PDF:', pdfError);
            }
          }
        } catch (cnError) {
          console.error('Error in credit note creation:', cnError);
        }
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
