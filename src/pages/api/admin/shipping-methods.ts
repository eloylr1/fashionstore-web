/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Shipping Methods
 * CRUD para métodos de envío
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

function getSupabase() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Obtener todos los métodos
export const GET: APIRoute = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('shipping_methods')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify({ methods: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// POST - Crear nuevo método
export const POST: APIRoute = async ({ request }) => {
  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, description, cost, estimated_days, icon, free_above, is_enabled } = body;

    if (!name || cost === undefined || !estimated_days) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400 });
    }

    // Obtener el mayor sort_order actual
    const { data: maxOrder } = await supabase
      .from('shipping_methods')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sort_order = (maxOrder?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('shipping_methods')
      .insert({
        name,
        description: description || null,
        cost,
        estimated_days,
        icon: icon || 'standard',
        free_above: free_above || null,
        is_enabled: is_enabled ?? true,
        sort_order,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ method: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// PUT - Actualizar método
export const PUT: APIRoute = async ({ request, url }) => {
  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    const body = await request.json();
    const updates: any = {};

    // Solo incluir campos que se enviaron
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.cost !== undefined) updates.cost = body.cost;
    if (body.estimated_days !== undefined) updates.estimated_days = body.estimated_days;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.free_above !== undefined) updates.free_above = body.free_above;
    if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled;
    if (body.is_default !== undefined) updates.is_default = body.is_default;

    const { data, error } = await supabase
      .from('shipping_methods')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ method: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// DELETE - Eliminar método
export const DELETE: APIRoute = async ({ url }) => {
  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    // No permitir eliminar el método por defecto
    const { data: method } = await supabase
      .from('shipping_methods')
      .select('is_default')
      .eq('id', id)
      .single();

    if (method?.is_default) {
      return new Response(JSON.stringify({ error: 'No puedes eliminar el método predeterminado' }), { status: 400 });
    }

    const { error } = await supabase
      .from('shipping_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
