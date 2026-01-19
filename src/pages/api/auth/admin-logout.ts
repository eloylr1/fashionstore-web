/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Admin Logout Endpoint
 * Cierra sesión de admin y redirige al login de admin
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  cookies.delete('user-role', { path: '/' });
  
  return redirect('/admin/acceso-seguro');
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  cookies.delete('user-role', { path: '/' });
  
  return redirect('/admin/acceso-seguro');
};
