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

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route) && pathname !== LOGIN_ROUTE
  );
  
  if (isProtectedRoute) {
    // Obtener tokens de autenticación de Supabase
    const accessToken = context.cookies.get('sb-access-token')?.value;
    const userRole = context.cookies.get('user-role')?.value;
    
    // Si no hay token o no es admin, redirigir al login
    if (!accessToken || userRole !== 'admin') {
      return context.redirect(`${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}`);
    }
    
    // Token válido y es admin, añadir info al contexto locals
    context.locals.isAdmin = true;
    context.locals.adminToken = accessToken;
  }
  
  // Continuar con la petición
  return next();
});

// Declaración de tipos para locals
declare global {
  namespace App {
    interface Locals {
      isAdmin?: boolean;
      adminToken?: string;
    }
  }
}
