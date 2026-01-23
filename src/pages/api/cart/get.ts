/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Obtener Carrito del Usuario
 * Devuelve los items del carrito del usuario autenticado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ items: [], userId: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ items: [], userId: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Obtener carrito del usuario usando la RPC
    const { data: cartItems, error: cartError } = await supabase
      .rpc('get_user_cart', { p_user_id: user.id });
    
    if (cartError) {
      // Si la función no existe, intentar consulta directa
      const { data: directItems, error: directError } = await supabase
        .from('user_cart_items')
        .select(`
          product_id,
          quantity,
          size,
          products (
            name,
            slug,
            price,
            images,
            stock
          )
        `)
        .eq('user_id', user.id);
      
      if (directError) {
        console.error('Error fetching cart:', directError);
        return new Response(
          JSON.stringify({ items: [], userId: user.id }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Transformar resultados
      const items = (directItems || []).map((item: any) => ({
        product_id: item.product_id,
        name: item.products?.name || 'Producto',
        slug: item.products?.slug || '',
        price: item.products?.price || 0,
        quantity: item.quantity,
        size: item.size,
        image: item.products?.images?.[0] || '/placeholder.jpg',
        stock: item.products?.stock || 99,
      }));
      
      return new Response(
        JSON.stringify({ items, userId: user.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ items: cartItems || [], userId: user.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in get cart:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
