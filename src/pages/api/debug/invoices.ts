/**
 * API: Diagnóstico de Facturas
 * Verificar estado de la tabla invoices y crear factura de prueba
 * ELIMINAR DESPUÉS DE USAR
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const GET: APIRoute = async ({ url }) => {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const action = url.searchParams.get('action');
    
    // Acción: Crear factura para un pedido específico
    if (action === 'create-for-order') {
      const orderId = url.searchParams.get('orderId');
      
      // Obtener el pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Pedido no encontrado', details: orderError }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Verificar si ya tiene factura
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single();
        
      if (existingInvoice) {
        return new Response(
          JSON.stringify({ 
            message: 'El pedido ya tiene factura',
            invoice: existingInvoice 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Generar número de factura
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .ilike('invoice_number', `FM-${year}-%`);
      
      const invoiceNumber = `FM-${year}-${String((count || 0) + 1).padStart(6, '0')}`;
      
      // Crear factura
      const invoiceData = {
        order_id: order.id,
        user_id: order.user_id || null,
        invoice_number: invoiceNumber,
        customer_name: order.shipping_address?.name || order.shipping_address?.full_name || order.guest_name || 'Cliente',
        customer_email: order.guest_email || 'unknown@email.com',
        customer_address: order.shipping_address,
        subtotal: order.subtotal,
        tax_rate: 21,
        tax_amount: order.tax || Math.round(order.subtotal * 0.21),
        total: order.total,
        status: 'paid',
        payment_method: 'card',
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        paid_date: order.created_at,
        items: [], // No tenemos los items aquí
      };
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
        
      if (invoiceError) {
        return new Response(
          JSON.stringify({ 
            error: 'Error creando factura',
            details: invoiceError,
            attemptedData: invoiceData
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Factura creada correctamente',
          invoice 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Acción por defecto: diagnóstico
    
    // 1. Verificar si la tabla existe y contar facturas
    const { data: invoices, error: invoicesError, count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Verificar pedidos existentes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, user_id, guest_email, total, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Verificar pedidos SIN factura
    const orderIds = orders?.map(o => o.id) || [];
    const { data: invoicesForOrders } = await supabase
      .from('invoices')
      .select('order_id')
      .in('order_id', orderIds);
    
    const orderIdsWithInvoice = new Set(invoicesForOrders?.map(i => i.order_id) || []);
    const ordersWithoutInvoice = orders?.filter(o => !orderIdsWithInvoice.has(o.id)) || [];

    // 4. Intentar insertar una factura de prueba con user_id null
    const testInvoiceNumber = `TEST-${Date.now()}`;
    const testOrderId = orders?.[0]?.id;
    
    let testResult: any = { skipped: true, reason: 'No hay pedidos para probar' };
    
    if (testOrderId) {
      const { data: testInvoice, error: testError } = await supabase
        .from('invoices')
        .insert({
          order_id: testOrderId,
          user_id: null,
          invoice_number: testInvoiceNumber,
          customer_name: 'Test Customer',
          customer_email: 'test@test.com',
          customer_address: { test: true },
          subtotal: 1000,
          tax_rate: 21,
          tax_amount: 210,
          total: 1210,
          status: 'test',
          items: [{ name: 'Test Item', quantity: 1, unit_price: 1000, total: 1000 }],
        })
        .select()
        .single();

      if (testInvoice) {
        await supabase.from('invoices').delete().eq('id', testInvoice.id);
        testResult = { success: true, message: 'Insert con user_id NULL funciona' };
      } else {
        testResult = { success: false, error: testError?.message, details: testError };
      }
    }

    return new Response(
      JSON.stringify({
        status: 'OK',
        totalInvoices: count,
        recentInvoices: invoices?.map(i => ({
          id: i.id,
          invoice_number: i.invoice_number,
          order_id: i.order_id,
          customer_email: i.customer_email,
          user_id: i.user_id,
          created_at: i.created_at,
        })),
        invoicesError: invoicesError?.message,
        recentOrders: orders,
        ordersError: ordersError?.message,
        ordersWithoutInvoice: ordersWithoutInvoice.map(o => ({
          id: o.id,
          order_number: o.order_number,
          createInvoiceUrl: `/api/debug/invoices?action=create-for-order&orderId=${o.id}`
        })),
        testInsertWithNullUserId: testResult,
      }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
