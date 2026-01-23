/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Category API (Single)
 * Endpoints para gestión de una categoría específica
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
// IMPORTANTE: Usar SUPABASE_SERVICE_ROLE_KEY para operaciones admin (permisos completos)
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente con service role para operaciones admin
const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials missing:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey 
    });
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Función helper para respuestas JSON
const jsonResponse = (data: any, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

// GET - Obtener una categoría
export const GET: APIRoute = async ({ params, cookies }) => {
  const userRole = cookies.get('user-role')?.value;
  if (userRole !== 'admin') {
    return jsonResponse({ error: 'No autorizado', code: 'UNAUTHORIZED' }, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse({ 
      error: 'Error de configuración del servidor. Contacta al administrador.', 
      code: 'CONFIG_ERROR' 
    }, 500);
  }

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

    if (error) {
      console.error('Error fetching category:', error);
      throw error;
    }

    return jsonResponse(data);
  } catch (error: any) {
    console.error('Error fetching category:', error);
    return jsonResponse({ 
      error: 'Categoría no encontrada', 
      code: 'NOT_FOUND',
      details: error?.message 
    }, 404);
  }
};

// PUT - Actualizar una categoría
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const userRole = cookies.get('user-role')?.value;
  if (userRole !== 'admin') {
    return jsonResponse({ error: 'No autorizado', code: 'UNAUTHORIZED' }, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse({ 
      error: 'Error de configuración del servidor. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurado.', 
      code: 'CONFIG_ERROR' 
    }, 500);
  }

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
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    return jsonResponse(data);
  } catch (error: any) {
    console.error('Error updating category:', error);
    return jsonResponse({ 
      error: 'Error al actualizar categoría. Verifica los permisos de la base de datos.', 
      code: 'UPDATE_ERROR',
      details: error?.message || error?.code
    }, 500);
  }
};

// DELETE - Eliminar una categoría
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const userRole = cookies.get('user-role')?.value;
  if (userRole !== 'admin') {
    return jsonResponse({ error: 'No autorizado', code: 'UNAUTHORIZED' }, 401);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonResponse({ 
      error: 'Error de configuración del servidor. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurado.', 
      code: 'CONFIG_ERROR' 
    }, 500);
  }

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

    if (updateError) {
      console.error('Error updating products:', updateError);
      // Continuamos aunque falle, podría no haber productos
    }

    // Luego eliminar la categoría
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    return jsonResponse({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return jsonResponse({ 
      error: 'Error al eliminar categoría. Verifica los permisos de la base de datos.', 
      code: 'DELETE_ERROR',
      details: error?.message || error?.code
    }, 500);
  }
};
