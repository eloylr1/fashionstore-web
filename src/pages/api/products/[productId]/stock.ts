/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Stock por Variante (Talla + Color)
 * Endpoint para obtener el stock de cada variante de un producto
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Función para detectar qué tabla de stock usar
const getStockTable = async (supabase: any): Promise<string> => {
  // Intentar primero con product_variant_stock (nueva tabla)
  const { data: variantTable } = await supabase
    .from('product_variant_stock')
    .select('id')
    .limit(1);
  
  if (variantTable !== null) {
    return 'product_variant_stock';
  }
  
  return 'product_size_stock';
};

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
    const stockTable = await getStockTable(supabase);

    // Obtener stock de todas las variantes del producto
    const { data: stockData, error } = await supabase
      .from(stockTable as any)
      .select('size, color, stock')
      .eq('product_id', productId)
      .order('size');

    if (error) {
      console.error('Error fetching stock:', error);
      return new Response(
        JSON.stringify({ error: 'Error al obtener stock' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Procesar datos
    interface StockItem {
      size: string | null;
      color: string | null;
      stock: number;
    }
    
    const stockBySize: Record<string, number> = {};
    const stockByVariant: Record<string, number> = {}; // "size_color" -> stock
    let totalStock = 0;
    
    const stockItems = (stockData || []) as StockItem[];
    stockItems.forEach((item) => {
      // Agregar al total por talla (compatibilidad)
      if (item.size) {
        stockBySize[item.size] = (stockBySize[item.size] || 0) + item.stock;
      }
      
      // Agregar al mapa de variantes
      const variantKey = `${item.size || '_'}_${item.color || '_'}`;
      stockByVariant[variantKey] = item.stock;
      
      totalStock += item.stock;
    });

    // Items con formato normalizado
    const items = stockItems.map((item) => ({
      size: item.size,
      color: item.color || null,
      stock: item.stock
    }));

    return new Response(
      JSON.stringify({ 
        productId,
        stockBySize,      // Compatibilidad con versiones anteriores
        stockByVariant,   // Nuevo: "S_Azul" -> 5
        totalStock,
        items,            // Array completo de variantes
        hasColors: stockTable === 'product_variant_stock'
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
