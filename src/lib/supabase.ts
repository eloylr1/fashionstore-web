/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Supabase Client Singleton
 * Cliente unificado de Supabase para toda la aplicación
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';

// Variables de entorno
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE PÚBLICO (Anon Key)
// Para operaciones del lado del cliente y SSG
// ─────────────────────────────────────────────────────────────────────────────

let publicClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  if (!publicClient) {
    publicClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  
  return publicClient;
}

// Alias para compatibilidad
export const supabase = getSupabaseClient();

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE ADMIN (Service Role Key)
// SOLO para operaciones del servidor con permisos elevados
// ─────────────────────────────────────────────────────────────────────────────

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  if (!adminClient) {
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return adminClient;
}

// Alias para compatibilidad
export const supabaseAdmin = getSupabaseAdmin();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si el cliente público de Supabase está configurado
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Verifica si el cliente admin de Supabase está configurado
 */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

// Re-exportar tipos de la base de datos
export type { Database } from './supabase/database.types';
