/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Product Search
 * Endpoint para búsqueda de productos con debounce en el cliente
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

const MAX_QUERY_LENGTH = 50;
const MIN_QUERY_LENGTH = 1;
const MAX_RESULTS = 6;

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // Obtener y validar query
    const query = url.searchParams.get('q')?.trim() || '';

    // Validaciones de seguridad
    if (query.length < MIN_QUERY_LENGTH) {
      return new Response(
        JSON.stringify([]),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Búsqueda demasiado larga' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitizar: eliminar caracteres especiales de SQL
    const sanitizedQuery = query.replace(/[%_\\'"]/g, '');
    
    if (!sanitizedQuery) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Buscar productos con ILIKE (case-insensitive)
    // Busca en nombre y descripción
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, slug, images, price')
      .or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
      .gt('stock', 0) // Solo productos con stock
      .order('featured', { ascending: false }) // Destacados primero
      .order('name', { ascending: true })
      .limit(MAX_RESULTS);

    if (error) {
      console.error('Error searching products:', error);
      return new Response(
        JSON.stringify({ error: 'Error en la búsqueda' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transformar resultados
    const results: SearchResult[] = (products || []).map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
      price: product.price,
    }));

    return new Response(
      JSON.stringify(results),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache 1 minuto
        } 
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
