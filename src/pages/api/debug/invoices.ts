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

export const GET: APIRoute = async () => {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Verificar si la tabla existe y contar facturas
    const { data: invoices, error: invoicesError, count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Verificar pedidos existentes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, user_id, guest_email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Intentar insertar una factura de prueba con user_id null
    const testInvoiceNumber = `TEST-${Date.now()}`;
    const { data: testInvoice, error: testError } = await supabase
      .from('invoices')
      .insert({
        order_id: orders?.[0]?.id || '00000000-0000-0000-0000-000000000000',
        user_id: null, // Probar si acepta null
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

    // 4. Si se creó, eliminarla
    if (testInvoice) {
      await supabase
        .from('invoices')
        .delete()
        .eq('id', testInvoice.id);
    }

    return new Response(
      JSON.stringify({
        status: 'OK',
        totalInvoices: count,
        recentInvoices: invoices?.map(i => ({
          id: i.id,
          invoice_number: i.invoice_number,
          customer_email: i.customer_email,
          user_id: i.user_id,
          created_at: i.created_at,
        })),
        invoicesError: invoicesError?.message,
        recentOrders: orders,
        ordersError: ordersError?.message,
        testInsertWithNullUserId: {
          success: !!testInvoice,
          error: testError?.message,
          details: testError,
        },
        fix: testError ? 'NECESITAS EJECUTAR: ALTER TABLE invoices ALTER COLUMN user_id DROP NOT NULL;' : 'La tabla acepta user_id NULL correctamente',
      }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
