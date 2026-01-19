/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Cambiar Contraseña
 * Endpoint para actualizar la contraseña del usuario autenticado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar tokens de sesión
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'No autenticado. Por favor, inicia sesión.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parsear body
    const body = await request.json();
    const { newPassword } = body;

    // Validar contraseña
    if (!newPassword || typeof newPassword !== 'string') {
      return new Response(
        JSON.stringify({ error: 'La contraseña es requerida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con tokens del usuario
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Establecer sesión del usuario
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida. Por favor, inicia sesión de nuevo.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      
      // Manejar errores específicos de Supabase
      if (updateError.message.includes('same password')) {
        return new Response(
          JSON.stringify({ error: 'La nueva contraseña debe ser diferente a la actual' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Error al actualizar la contraseña. Inténtalo de nuevo.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Actualizar tokens en cookies (Supabase puede regenerarlos)
    if (sessionData.session) {
      cookies.set('sb-access-token', sessionData.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 semana
      });
      cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 días
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Contraseña actualizada correctamente' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in change-password:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado. Inténtalo de nuevo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
