/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Category API (Single)
 * Endpoints para gestión de una categoría específica
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';

// Función helper para respuestas JSON
const jsonResponse = (data: any, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

// GET - Obtener una categoría
export const GET: APIRoute = async ({ params, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return jsonResponse({ error: 'ID requerido', code: 'MISSING_ID' }, 400);
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return jsonResponse(data);
  } catch (error: any) {
    return jsonResponse({ 
      error: 'Categoría no encontrada', 
      code: 'NOT_FOUND'
    }, 404);
  }
};

// PUT - Actualizar una categoría
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return jsonResponse({ error: 'ID requerido', code: 'MISSING_ID' }, 400);
    }
    
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return jsonResponse({ 
        error: 'Nombre y slug son requeridos', 
        code: 'VALIDATION_ERROR' 
      }, 400);
    }

    // Verificar si el slug ya existe en otra categoría
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .single();

    if (existing) {
      return jsonResponse({ 
        error: 'Ya existe otra categoría con ese slug', 
        code: 'DUPLICATE_SLUG' 
      }, 400);
    }

    // @ts-ignore - Supabase types issue
    const { data, error } = await supabase
      .from('categories')
      .update({ name, slug })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(data);
  } catch (error: any) {
    return jsonResponse({ 
      error: 'Error al actualizar categoría', 
      code: 'UPDATE_ERROR'
    }, 500);
  }
};

// DELETE - Eliminar una categoría
export const DELETE: APIRoute = async ({ params, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return jsonResponse({ error: 'ID requerido', code: 'MISSING_ID' }, 400);
    }

    // Primero, quitar la categoría de los productos que la usan
    const { error: updateError } = await supabase
      .from('products')
      .update({ category_id: null })
      .eq('category_id', id);

    // Luego eliminar la categoría
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    return jsonResponse({ 
      error: 'Error al eliminar categoría', 
      code: 'DELETE_ERROR'
    }, 500);
  }
};
