/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Stock por Talla
 * Endpoint para obtener el stock de cada talla de un producto
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const GET: APIRoute = async ({ params }) => {
  const { productId } = params;

  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'ID de producto requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obtener stock de todas las tallas del producto
    const { data: stockData, error } = await supabase
      .from('product_size_stock')
      .select('size, stock')
      .eq('product_id', productId)
      .order('size');

    if (error) {
      console.error('Error fetching stock:', error);
      return new Response(
        JSON.stringify({ error: 'Error al obtener stock' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convertir a objeto para acceso rápido
    const stockBySize: Record<string, number> = {};
    let totalStock = 0;
    
    (stockData || []).forEach((item: { size: string; stock: number }) => {
      stockBySize[item.size] = item.stock;
      totalStock += item.stock;
    });

    return new Response(
      JSON.stringify({ 
        productId,
        stockBySize,
        totalStock,
        items: stockData || []
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
