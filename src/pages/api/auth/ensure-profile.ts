/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Ensure Profile Endpoint
 * Asegura que un usuario OAuth tenga un perfil creado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const POST: APIRoute = async ({ request }) => {
  const { user_id, email, full_name, avatar_url, provider } = await request.json();
  
  if (!user_id || !email) {
    return new Response(JSON.stringify({ error: 'User ID y email requeridos' }), {
      status: 400,
    });
  }
  
  // Usar service role para operaciones de servidor
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Verificar si el perfil ya existe
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user_id)
      .single();
    
    if (existingProfile) {
      // Perfil ya existe, retornar el rol
      return new Response(JSON.stringify({ 
        success: true, 
        role: existingProfile.role,
        isNew: false 
      }), {
        status: 200,
      });
    }
    
    // Crear nuevo perfil para usuario OAuth
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user_id,
        email,
        full_name: full_name || email.split('@')[0],
        avatar_url: avatar_url || null,
        role: 'customer', // OAuth users siempre son customers
        provider: provider || 'oauth',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating profile:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Error al crear perfil',
        details: insertError.message 
      }), {
        status: 500,
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      role: 'customer',
      isNew: true 
    }), {
      status: 200,
    });
    
  } catch (error: any) {
    console.error('Error in ensure-profile:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error.message 
    }), {
      status: 500,
    });
  }
};
