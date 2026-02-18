/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Profile API
 * Endpoint para actualizar perfil del administrador
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../lib/supabase/server';

const jsonResponse = (data: any, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const body = await request.json();
    const { full_name, phone } = body;

    // Actualizar perfil en la tabla profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: full_name || null,
        phone: phone || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', auth.userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return jsonResponse({ error: 'Error al actualizar perfil' }, 500);
    }

    return jsonResponse({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (error: any) {
    console.error('Error in profile update:', error);
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};
