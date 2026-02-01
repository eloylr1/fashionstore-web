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
import { sendOrderCancellationEmail } from '../../../lib/email';

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
          }
        } catch (cnError) {
          console.error('Error in credit note creation:', cnError);
        }
      }

      if (orderData && profile?.email) {
        // Enviar email de confirmación de cancelación
        await sendOrderCancellationEmail({
          orderNumber: orderData.order_number || result.order_number,
          customerName: profile.full_name || orderData.shipping_name || 'Cliente',
          customerEmail: profile.email,
          items: (orderData.order_items || []).map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
          })),
          total: orderData.total,
          cancellationDate: new Date().toISOString(),
        });
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
