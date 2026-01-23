/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Procesar Devolución con Reembolso
 * Procesa el reembolso vía Stripe y genera factura de abono (nota de crédito)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || '';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración del servidor incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuario no válido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar que es admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'No autorizado' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parsear body
    const body = await request.json();
    const { return_id, refund_method = 'stripe' } = body;
    
    if (!return_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID de devolución requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Obtener datos de la devolución
    const { data: returnData, error: returnError } = await supabase
      .from('returns')
      .select(`
        *,
        orders (
          id,
          order_number,
          stripe_payment_intent_id,
          total
        )
      `)
      .eq('id', return_id)
      .single();
    
    if (returnError || !returnData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Devolución no encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar estado de la devolución
    if (!['approved', 'received'].includes(returnData.status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'La devolución debe estar aprobada o recibida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const refundAmount = returnData.refund_amount || returnData.orders?.total || 0;
    let stripeRefundId: string | null = null;
    
    // Procesar reembolso con Stripe si hay payment_intent
    if (refund_method === 'stripe' && returnData.orders?.stripe_payment_intent_id && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey);
        
        const refund = await stripe.refunds.create({
          payment_intent: returnData.orders.stripe_payment_intent_id,
          amount: refundAmount, // En céntimos
          reason: 'requested_by_customer',
          metadata: {
            return_id: return_id,
            return_number: returnData.return_number,
            order_number: returnData.orders.order_number,
          },
        });
        
        stripeRefundId = refund.id;
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error procesando reembolso: ${stripeError.message}` 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Generar factura de abono usando la RPC
    const { data: creditNoteResult, error: creditNoteError } = await supabase
      .rpc('process_return_with_credit_note', {
        p_return_id: return_id,
        p_refund_method: refund_method,
        p_stripe_refund_id: stripeRefundId,
      });
    
    if (creditNoteError) {
      console.error('Credit note error:', creditNoteError);
      
      // Si la RPC no existe, crear la nota de crédito manualmente
      const creditNoteNumber = await generateCreditNoteNumber(supabase);
      
      // Obtener la factura original
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', returnData.order_id)
        .single();
      
      if (invoice) {
        // Calcular importes negativos
        const subtotal = -Math.abs(refundAmount);
        const taxAmount = Math.round(subtotal * (invoice.tax_rate || 21) / 100);
        const total = subtotal + taxAmount;
        
        // Obtener items devueltos
        const { data: returnItems } = await supabase
          .from('return_items')
          .select(`
            quantity,
            order_items (product_name, size, unit_price)
          `)
          .eq('return_id', return_id);
        
        const items = (returnItems || []).map((ri: any) => ({
          name: ri.order_items?.product_name || 'Producto devuelto',
          quantity: ri.quantity,
          size: ri.order_items?.size,
          unit_price: -Math.abs(ri.order_items?.unit_price || 0),
          total: -Math.abs((ri.order_items?.unit_price || 0) * ri.quantity),
        }));
        
        // Insertar nota de crédito
        const { error: insertError } = await supabase
          .from('credit_notes')
          .insert({
            credit_note_number: creditNoteNumber,
            original_invoice_id: invoice.id,
            return_id: return_id,
            user_id: returnData.user_id,
            customer_name: invoice.customer_name,
            customer_email: invoice.customer_email,
            customer_nif: invoice.customer_nif,
            customer_address: invoice.customer_address,
            subtotal,
            tax_rate: invoice.tax_rate,
            tax_amount: taxAmount,
            total,
            status: stripeRefundId ? 'refunded' : 'pending',
            refund_method,
            stripe_refund_id: stripeRefundId,
            reason: `Devolución ${returnData.return_number}: ${returnData.reason || 'Sin especificar'}`,
            items,
            refunded_date: stripeRefundId ? new Date().toISOString() : null,
          });
        
        if (insertError) {
          console.error('Insert credit note error:', insertError);
        }
      }
      
      // Actualizar estado de la devolución
      await supabase
        .from('returns')
        .update({
          status: 'refunded',
          completed_at: new Date().toISOString(),
        })
        .eq('id', return_id);
      
      // Actualizar estado del pedido
      await supabase
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', returnData.order_id);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Devolución procesada correctamente',
          credit_note_number: creditNoteNumber,
          refund_amount: Math.abs(refundAmount),
          stripe_refund_id: stripeRefundId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const result = creditNoteResult?.[0] || creditNoteResult;
    
    return new Response(
      JSON.stringify({
        success: result?.success ?? true,
        message: result?.message || 'Devolución procesada correctamente',
        credit_note_number: result?.credit_note_number,
        refund_amount: result?.refund_amount || Math.abs(refundAmount),
        stripe_refund_id: stripeRefundId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Error inesperado' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper para generar número de nota de crédito
async function generateCreditNoteNumber(supabase: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CN-${year}-`;
  
  const { data } = await supabase
    .from('credit_notes')
    .select('credit_note_number')
    .ilike('credit_note_number', `${prefix}%`)
    .order('credit_note_number', { ascending: false })
    .limit(1);
  
  let seq = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].credit_note_number;
    const match = lastNum.match(/CN-\d{4}-(\d+)/);
    if (match) {
      seq = parseInt(match[1], 10) + 1;
    }
  }
  
  return `${prefix}${seq.toString().padStart(6, '0')}`;
}
