/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Notificar Stock
 * Endpoint para suscribirse a notificaciones de stock
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface NotifyRequest {
  email: string;
  size: string;
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const { productId } = params;

  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'ID de producto requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: NotifyRequest = await request.json();
    const { email, size } = body;

    if (!email || !size) {
      return new Response(
        JSON.stringify({ error: 'Email y talla requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email no válido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Intentar obtener user_id si hay sesión
    let userId: string | null = null;
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      const anonClient = createClient(
        supabaseUrl,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data: sessionData } = await anonClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      userId = sessionData?.user?.id || null;
    }

    // Verificar que el producto existe
    const { data: product } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Producto no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insertar suscripción
    const { error } = await supabase
      .from('stock_notifications')
      .upsert({
        product_id: productId,
        size,
        email,
        user_id: userId,
        notified: false
      }, {
        onConflict: 'product_id,size,email'
      });

    if (error) {
      console.error('Error subscribing to notification:', error);
      return new Response(
        JSON.stringify({ error: 'Error al suscribirse' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Te avisaremos cuando la talla ${size} esté disponible`
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
