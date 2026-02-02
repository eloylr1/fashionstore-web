/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Toggle Wishlist
 * Añadir/quitar producto de la lista de deseos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { supabase as sb } from '../../../lib/supabase/client';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = sb as any;
    
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ 
        error: 'No autenticado',
        requiresLogin: true 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(JSON.stringify({ 
        error: 'Sesión inválida',
        requiresLogin: true 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = sessionData.user.id;

    // Obtener product_id del body
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return new Response(JSON.stringify({ 
        error: 'product_id es requerido' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si ya existe en wishlist
    const { data: existing } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .single();

    let action: 'added' | 'removed';

    if (existing) {
      // Ya existe - eliminar
      const { error: deleteError } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', product_id);

      if (deleteError) throw deleteError;
      action = 'removed';
    } else {
      // No existe - añadir
      const { error: insertError } = await supabase
        .from('wishlist')
        .insert({
          user_id: userId,
          product_id: product_id
        });

      if (insertError) throw insertError;
      action = 'added';
    }

    return new Response(JSON.stringify({ 
      success: true,
      action,
      isFavorite: action === 'added'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return new Response(JSON.stringify({ 
      error: 'Error al actualizar favoritos' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
