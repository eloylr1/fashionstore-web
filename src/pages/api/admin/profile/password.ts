/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Password Change API
 * Endpoint para cambiar contraseña del administrador
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

const jsonResponse = (data: any, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  // Verificar autenticación
  const userRole = cookies.get('user-role')?.value?.toLowerCase();
  if (userRole !== 'admin') {
    return jsonResponse({ error: 'No autorizado' }, 401);
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return jsonResponse({ error: 'No autenticado' }, 401);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Error de configuración del servidor' }, 500);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return jsonResponse({ error: 'Usuario no encontrado' }, 404);
    }

    const body = await request.json();
    const { new_password } = body;

    if (!new_password || new_password.length < 6) {
      return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    }

    // Actualizar contraseña usando service role (admin)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return jsonResponse({ error: 'Error al cambiar contraseña' }, 500);
    }

    return jsonResponse({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    console.error('Error in password change:', error);
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};
