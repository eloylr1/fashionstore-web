/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Middleware
 * Middleware de autenticación para rutas protegidas (/admin)
 * Con refresh automático de tokens de Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

// Rutas que requieren autenticación de admin
const PROTECTED_ROUTES = ['/admin'];
const PUBLIC_ADMIN_ROUTES = ['/admin/acceso-seguro', '/admin/login'];
const LOGIN_ROUTE = '/admin/acceso-seguro';

// Helper para crear cliente de Supabase
function getSupabaseClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  
  // Normalizar pathname (quitar trailing slash)
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' 
    ? pathname.slice(0, -1) 
    : pathname;
  
  // Log para debug
  console.log(`[MIDDLEWARE] Request: ${normalizedPath}`);
  
  // Log para debug de API calls
  if (normalizedPath.startsWith('/api/')) {
    console.log(`[MIDDLEWARE] API call: ${context.request.method} ${normalizedPath}`);
  }
  
  // Verificar si es una ruta pública de admin (login, etc) - PRIORIDAD MÁXIMA
  const isPublicAdminRoute = PUBLIC_ADMIN_ROUTES.some(route => 
    normalizedPath === route || normalizedPath.startsWith(route + '/')
  );
  
  // Si es ruta pública de admin, SIEMPRE continuar sin verificación
  if (isPublicAdminRoute) {
    console.log(`[MIDDLEWARE] Ruta pública admin, permitiendo: ${normalizedPath}`);
    return next();
  }
  
  // Para rutas que NO son /admin, continuar directamente
  if (!normalizedPath.startsWith('/admin')) {
    return next();
  }
  
  // A partir de aquí, solo rutas /admin protegidas
  console.log(`[MIDDLEWARE] Ruta protegida: ${normalizedPath}`);
  
  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    normalizedPath.startsWith(route)
  );
  
  if (isProtectedRoute) {
    // Obtener tokens de autenticación de Supabase
    let accessToken = context.cookies.get('sb-access-token')?.value;
    const refreshToken = context.cookies.get('sb-refresh-token')?.value;
    const userRole = context.cookies.get('user-role')?.value;
    
    // Si no hay token o no es admin, redirigir al login
    if (!accessToken || userRole !== 'admin') {
      return context.redirect(`${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}`);
    }
    
    // Verificar si el token sigue siendo válido
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        // Si el token expiró pero tenemos refresh token, intentar refrescar
        if (error && refreshToken) {
          console.log('[MIDDLEWARE] Token expirado, intentando refresh...');
          
          // Usar el cliente con anon key para refresh
          const anonUrl = import.meta.env.PUBLIC_SUPABASE_URL;
          const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
          
          if (anonUrl && anonKey) {
            const anonClient = createClient(anonUrl, anonKey);
            const { data: refreshData, error: refreshError } = await anonClient.auth.refreshSession({
              refresh_token: refreshToken
            });
            
            if (refreshData?.session && !refreshError) {
              // Guardar nuevos tokens en cookies
              const maxAge = 60 * 60 * 24 * 7; // 7 días
              context.cookies.set('sb-access-token', refreshData.session.access_token, {
                path: '/',
                maxAge,
                sameSite: 'lax',
                httpOnly: false
              });
              context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
                path: '/',
                maxAge,
                sameSite: 'lax',
                httpOnly: false
              });
              
              accessToken = refreshData.session.access_token;
              console.log('[MIDDLEWARE] Token refrescado exitosamente');
            } else {
              console.log('[MIDDLEWARE] Error al refrescar token:', refreshError?.message);
              // Redirigir al login si no se puede refrescar
              return context.redirect(`${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}&expired=1`);
            }
          }
        } else if (error) {
          // Token inválido y sin refresh token
          console.log('[MIDDLEWARE] Token inválido sin refresh');
          return context.redirect(`${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}&expired=1`);
        }
      } catch (err) {
        console.error('[MIDDLEWARE] Error verificando token:', err);
      }
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
