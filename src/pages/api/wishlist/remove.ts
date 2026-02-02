/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Remove from Wishlist
 * Eliminar producto de la lista de deseos (para formularios)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { supabase as sb } from '../../../lib/supabase/client';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const supabase = sb as any;
    
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return redirect('/login?redirect=/cuenta/favoritos');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return redirect('/login?redirect=/cuenta/favoritos');
    }

    const userId = sessionData.user.id;

    // Obtener product_id del body (FormData)
    const formData = await request.formData();
    const productId = formData.get('product_id');

    if (!productId) {
      return redirect('/cuenta/favoritos?error=missing_product');
    }

    // Eliminar de wishlist
    await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    return redirect('/cuenta/favoritos?success=removed');

  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return redirect('/cuenta/favoritos?error=server_error');
  }
};
