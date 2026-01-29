/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Admin Session Endpoint
 * Establece cookies de sesión de admin del lado del servidor
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const body = await request.json();
    const { access_token, refresh_token, redirect_to = '/admin' } = body;
    
    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing tokens' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Configuración de cookies - 7 días
    const maxAge = 60 * 60 * 24 * 7;
    const cookieOptions = {
      path: '/',
      maxAge,
      sameSite: 'lax' as const,
      httpOnly: false, // Necesario para que el cliente pueda leerlas
      secure: request.url.startsWith('https')
    };
    
    // Establecer cookies del lado del servidor
    cookies.set('sb-access-token', access_token, cookieOptions);
    cookies.set('sb-refresh-token', refresh_token, cookieOptions);
    cookies.set('user-role', 'admin', cookieOptions);
    
    console.log('[ADMIN-SESSION] Cookies establecidas correctamente');
    
    return new Response(JSON.stringify({ 
      success: true, 
      redirect: redirect_to 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[ADMIN-SESSION] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
