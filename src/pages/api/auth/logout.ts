/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Logout Endpoint
 * Elimina las cookies de autenticación
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  cookies.delete('user-role', { path: '/' });
  
  // El localStorage se limpia en el cliente, aquí solo manejamos cookies
  return redirect('/login');
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // También permitir GET para links directos
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  cookies.delete('user-role', { path: '/' });
  
  return redirect('/login');
};
