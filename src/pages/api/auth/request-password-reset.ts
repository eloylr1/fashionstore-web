/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Solicitar Reset de Contraseña
 * Envía un email con enlace seguro para cambiar contraseña
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

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

    // Crear cliente Supabase
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

    const userEmail = sessionData.user.email;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'No se encontró el email del usuario' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enviar email de reset de contraseña
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (resetError) {
      console.error('Error sending reset email:', resetError);
      return new Response(
        JSON.stringify({ error: 'Error al enviar el email. Inténtalo de nuevo.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Hemos enviado un enlace a tu correo electrónico',
        email: userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Ocultar parte del email
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in request-password-reset:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado. Inténtalo de nuevo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
