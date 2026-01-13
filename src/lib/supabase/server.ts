/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Supabase Server Client
 * Cliente con permisos elevados para operaciones de admin/server
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

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
