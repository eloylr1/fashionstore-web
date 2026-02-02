/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Check Wishlist
 * Verificar si un producto está en la lista de deseos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { supabase as sb } from '../../../lib/supabase/client';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const supabase = sb as any;
    
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ 
        isLoggedIn: false,
        isFavorite: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(JSON.stringify({ 
        isLoggedIn: false,
        isFavorite: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = sessionData.user.id;
    const productId = url.searchParams.get('product_id');

    if (!productId) {
      return new Response(JSON.stringify({ 
        error: 'product_id es requerido' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si está en wishlist
    const { data: existing } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    return new Response(JSON.stringify({ 
      isLoggedIn: true,
      isFavorite: !!existing
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking wishlist:', error);
    return new Response(JSON.stringify({ 
      isLoggedIn: false,
      isFavorite: false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
