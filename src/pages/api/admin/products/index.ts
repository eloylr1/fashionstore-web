/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Products API (List)
 * Endpoints para listar productos
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';

// GET - Listar productos con filtros opcionales
export const GET: APIRoute = async ({ cookies, url }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    // Parámetros de filtrado
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const featured = url.searchParams.get('featured');
    const stockMin = url.searchParams.get('stockMin');
    const stockMax = url.searchParams.get('stockMax');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          slug
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (featured !== null && featured !== undefined) {
      query = query.eq('featured', featured === 'true');
    }

    if (stockMin) {
      query = query.gte('stock', parseInt(stockMin, 10));
    }

    if (stockMax) {
      query = query.lte('stock', parseInt(stockMax, 10));
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ 
      products: data || [],
      total: count || 0,
      limit,
      offset
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(JSON.stringify({ error: 'Error al obtener productos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Crear nuevo producto
export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      price, 
      stock = 0, 
      category_id, 
      images = [], 
      sizes = [], 
      colors = [], 
      material, 
      featured = false 
    } = body;

    // Validaciones
    if (!name || !description || price === undefined || !category_id) {
      return new Response(JSON.stringify({ 
        error: 'Nombre, descripción, precio y categoría son requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generar slug
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        slug,
        description,
        price,
        stock,
        category_id,
        images,
        sizes,
        colors,
        material,
        featured,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Producto creado correctamente',
      data 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({ error: 'Error al crear el producto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
