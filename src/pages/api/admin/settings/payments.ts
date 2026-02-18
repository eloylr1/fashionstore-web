/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Payments Settings API
 * Guardar configuración de pagos
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';

export const PUT: APIRoute = async ({ request, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

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
