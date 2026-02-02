/**
 * Debug endpoint para verificar facturas en la BD
 */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Obtener últimas 10 facturas
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_email, user_id, total, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Verificar estructura de la tabla
  const { data: columns } = await supabase.rpc('get_table_info', { table_name: 'invoices' }).single();

  return new Response(JSON.stringify({
    success: true,
    totalInvoices: invoices?.length || 0,
    invoices: invoices || [],
    error: error?.message,
    searchEmail: email,
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
