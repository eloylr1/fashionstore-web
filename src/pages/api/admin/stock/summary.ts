/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Admin: Resumen de Stock por Variantes (Batch)
 * Devuelve el stock de TODAS las variantes de TODOS los productos
 * para poder filtrar a nivel de variante en el panel de stock
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    // Intentar leer de product_variant_stock primero, luego product_size_stock
    let stockTable = 'product_variant_stock';
    const { data: check } = await supabase
      .from('product_variant_stock')
      .select('id')
      .limit(1);

    if (check === null) {
      stockTable = 'product_size_stock';
    }

    // Obtener todo el stock de variantes en una sola query
    const { data: allVariantStock, error } = await supabase
      .from(stockTable)
      .select('product_id, size, color, stock')
      .order('product_id');

    if (error) {
      console.error('Error fetching variant stock:', error);
      return new Response(
        JSON.stringify({ variantStock: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ variantStock: allVariantStock || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stock summary:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
