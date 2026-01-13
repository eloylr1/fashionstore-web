/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Supabase Client (Público)
 * Cliente para operaciones del lado del cliente y SSG
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Crear cliente solo si las variables están configuradas
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);
