/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Shipping Settings API
 * Guardar configuración de envíos
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
      .eq('category', 'shipping')
      .single();

    let result;
    if (existing) {
      // Actualizar
      result = await supabase
        .from('store_settings')
        .update({ 
          settings, 
          updated_at: new Date().toISOString() 
        })
        .eq('category', 'shipping')
        .select()
        .single();
    } else {
      // Insertar
      result = await supabase
        .from('store_settings')
        .insert({ 
          category: 'shipping', 
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
    console.error('Error saving shipping settings:', error);
    return new Response(JSON.stringify({ error: 'Error al guardar configuración' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
