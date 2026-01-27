/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Promotions API (Single)
 * Operaciones sobre un código promocional específico
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
};

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// OPTIONS - Para CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};

// GET - Obtener un código específico
export const GET: APIRoute = async ({ params, cookies }) => {
  const userRole = cookies.get('user-role')?.value?.toLowerCase();
  if (userRole !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase no configurado' }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error fetching discount code:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener el código' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};

// PATCH - Actualizar código (toggle active, etc)
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const userRole = cookies.get('user-role')?.value?.toLowerCase();
  if (userRole !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase no configurado' }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const body = await request.json();
    
    const updateData: Record<string, any> = {};

    if (body.active !== undefined) updateData.active = body.active;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.min_order_amount !== undefined) updateData.min_order_amount = body.min_order_amount;
    if (body.max_uses !== undefined) updateData.max_uses = body.max_uses;
    if (body.expires_at !== undefined) updateData.expires_at = body.expires_at || null;
    if (body.code !== undefined) updateData.code = body.code.toUpperCase();

    const { data, error } = await supabase
      .from('discount_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error updating discount code:', error);
    return new Response(JSON.stringify({ error: 'Error al actualizar el código' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};

// DELETE - Eliminar código
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const userRole = cookies.get('user-role')?.value?.toLowerCase();
  if (userRole !== 'admin') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase no configurado' }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return new Response(JSON.stringify({ error: 'Error al eliminar el código' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
