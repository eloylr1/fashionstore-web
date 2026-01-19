/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Login Endpoint
 * Guarda los tokens de autenticación y rol en cookies HttpOnly
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const { access_token, refresh_token, role } = await request.json();
  
  if (!access_token || !refresh_token) {
    return new Response(JSON.stringify({ error: 'Tokens requeridos' }), {
      status: 400,
    });
  }
  
  // Set secure cookies
  cookies.set('sb-access-token', access_token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
  
  cookies.set('sb-refresh-token', refresh_token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
  
  // Guardar el rol del usuario (no es sensible, puede no ser httpOnly)
  if (role) {
    cookies.set('user-role', role, {
      path: '/',
      httpOnly: false,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
  });
};
