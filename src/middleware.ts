/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Middleware
 * Middleware de autenticación para rutas protegidas (/admin)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { defineMiddleware } from 'astro:middleware';

// Rutas que requieren autenticación de admin
const PROTECTED_ROUTES = ['/admin'];
const LOGIN_ROUTE = '/admin/acceso-seguro';
const AUTH_COOKIE_NAME = 'admin-auth-token';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route) && pathname !== LOGIN_ROUTE
  );
  
  if (isProtectedRoute) {
    // Obtener token de autenticación de las cookies
    const authToken = context.cookies.get(AUTH_COOKIE_NAME)?.value;
    
    // Si no hay token, redirigir al login
    if (!authToken) {
      return context.redirect(`${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}`);
    }
    
    // Verificar token (implementar lógica según tu sistema de auth)
    const isValidToken = await verifyAdminToken(authToken);
    
    if (!isValidToken) {
      // Token inválido, limpiar cookie y redirigir
      context.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
      return context.redirect(`${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}&error=session_expired`);
    }
    
    // Token válido, añadir info del usuario al contexto locals
    context.locals.isAdmin = true;
    context.locals.adminToken = authToken;
  }
  
  // Continuar con la petición
  return next();
});

/**
 * Verifica si el token de admin es válido
 * @param token - Token a verificar
 * @returns true si el token es válido
 */
async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    // Implementar verificación real aquí:
    // - Verificar con Supabase Auth
    // - Verificar JWT
    // - Verificar en base de datos
    
    // Por ahora, verificación básica
    // En producción, implementar verificación segura
    if (!token || token.length < 10) {
      return false;
    }
    
    // TODO: Implementar verificación real con Supabase
    // const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    // return !error && user?.role === 'admin';
    
    return true;
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return false;
  }
}

// Declaración de tipos para locals
declare global {
  namespace App {
    interface Locals {
      isAdmin?: boolean;
      adminToken?: string;
    }
  }
}
