/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Payments Settings API
 * Guardar configuración de pagos
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const userRole = cookies.get('user-role')?.value?.toLowerCase();
  if (userRole !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase no configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const settings = await request.json();

    // Verificar si existe el registro
    const { data: existing } = await supabase
      .from('store_settings')
      .select('id')
      .eq('category', 'payments')
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('store_settings')
        .update({ 
          settings, 
          updated_at: new Date().toISOString() 
        })
        .eq('category', 'payments')
        .select()
        .single();
    } else {
      result = await supabase
        .from('store_settings')
        .insert({ 
          category: 'payments', 
          settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error saving payments settings:', error);
    return new Response(JSON.stringify({ error: 'Error al guardar configuración' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
