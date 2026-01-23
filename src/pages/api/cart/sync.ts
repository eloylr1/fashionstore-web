/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Sincronizar Carrito del Usuario
 * Guarda los items del carrito del usuario en la base de datos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface CartItem {
  productId: string;
  size: string;
  quantity: number;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
        JSON.stringify({ success: false, error: 'Usuario no válido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parsear body
    const body = await request.json();
    const items: CartItem[] = body.items || [];
    
    // Borrar carrito actual del usuario
    await supabase
      .from('user_cart_items')
      .delete()
      .eq('user_id', user.id);
    
    // Si hay items, insertarlos
    if (items.length > 0) {
      const cartData = items.map((item) => ({
        user_id: user.id,
        product_id: item.productId,
        size: item.size,
        quantity: item.quantity,
      }));
      
      const { error: insertError } = await supabase
        .from('user_cart_items')
        .insert(cartData);
      
      if (insertError) {
        console.error('Error inserting cart items:', insertError);
        // Intentar upsert individual si hay conflictos
        for (const item of cartData) {
          await supabase
            .from('user_cart_items')
            .upsert(item, { onConflict: 'user_id,product_id,size' });
        }
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in sync cart:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error inesperado' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
