/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Password Change API
 * Endpoint para cambiar contraseña del administrador
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';

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
    const { new_password } = body;

    if (!new_password || new_password.length < 6) {
      return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    }

    // Actualizar contraseña usando service role (admin)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      auth.userId!,
      { password: new_password }
    );

    if (updateError) {
      return jsonResponse({ error: 'Error al cambiar contraseña' }, 500);
    }

    return jsonResponse({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};
