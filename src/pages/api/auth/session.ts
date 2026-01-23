/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Obtener Sesión del Usuario
 * Devuelve información básica del usuario autenticado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ user: null, isLoggedIn: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ user: null, isLoggedIn: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return new Response(
        JSON.stringify({ user: null, isLoggedIn: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();
    
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: profile?.full_name || user.email?.split('@')[0] || 'Usuario',
          role: profile?.role || 'customer',
        },
        isLoggedIn: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error getting session:', error);
    return new Response(
      JSON.stringify({ user: null, isLoggedIn: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
