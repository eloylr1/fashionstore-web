/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Supabase Server Client
 * Cliente con permisos elevados para operaciones de admin/server
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente con service role key - SOLO usar en el servidor
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Helper para verificar si el cliente admin está configurado
export const isSupabaseAdminConfigured = () => Boolean(supabaseUrl && supabaseServiceKey);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICACIÓN SEGURA DE ADMIN
// Verifica el rol desde la base de datos, NO desde cookies
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminVerificationResult {
  isAdmin: boolean;
  userId?: string;
  error?: Response;
}

/**
 * Verifica si el usuario actual es administrador de forma SEGURA
 * Obtiene el rol desde la base de datos, no confía en cookies manipulables
 */
export async function verifyAdminSecure(cookies: AstroCookies): Promise<AdminVerificationResult> {
  if (!supabaseAdmin) {
    return {
      isAdmin: false,
      error: new Response(JSON.stringify({ error: 'Servidor no configurado' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  const token = cookies.get('sb-access-token')?.value;
  if (!token) {
    return {
      isAdmin: false,
      error: new Response(JSON.stringify({ error: 'No autorizado' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  // Verificar token y obtener usuario
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return {
      isAdmin: false,
      error: new Response(JSON.stringify({ error: 'Sesión inválida' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  // Verificar rol desde la base de datos (NO desde cookie)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role?.toLowerCase() !== 'admin') {
    return {
      isAdmin: false,
      error: new Response(JSON.stringify({ error: 'Acceso denegado' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  return { isAdmin: true, userId: user.id };
}

/**
 * Verifica si el usuario está autenticado (sin requerir admin)
 */
export async function verifyAuthenticated(cookies: AstroCookies): Promise<{ user: any; error?: Response }> {
  if (!supabaseAdmin) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Servidor no configurado' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  const token = cookies.get('sb-access-token')?.value;
  if (!token) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'No autorizado' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Sesión inválida' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }),
    };
  }

  return { user };
}
