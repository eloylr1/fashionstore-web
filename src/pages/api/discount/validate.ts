/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Validar Código de Descuento
 * Valida un código y devuelve el descuento calculado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    // Validaciones básicas
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Código requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof subtotal !== 'number' || subtotal < 0) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Subtotal inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener user_id si está autenticado (opcional)
    let userId: string | null = null;
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      const anonClient = createClient(
        supabaseUrl,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data: session } = await anonClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      userId = session?.user?.id || null;
    }

    // Buscar código de descuento
    const { data: discountCode, error: codeError } = await supabase
      .from('discount_codes')
      .select('*')
      .ilike('code', code.trim())
      .single();

    if (codeError || !discountCode) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Código no válido' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar estado activo
    if (!discountCode.active) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Este código ya no está activo' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar fecha de expiración
    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Este código ha expirado' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar máximo de usos
    if (discountCode.max_uses !== null && discountCode.uses_count >= discountCode.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Este código ha alcanzado su límite de usos' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar mínimo de compra
    if (discountCode.min_order_amount && subtotal < discountCode.min_order_amount) {
      const minAmount = (discountCode.min_order_amount / 100).toFixed(2);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: `Pedido mínimo de ${minAmount}€ requerido` 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si el usuario está logueado, verificar si ya usó el código
    if (userId) {
      const { data: redemption } = await supabase
        .from('discount_code_redemptions')
        .select('id')
        .eq('code_id', discountCode.id)
        .eq('user_id', userId)
        .single();

      if (redemption) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'Ya has utilizado este código' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validar solo primera compra
      if (discountCode.first_purchase_only) {
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', userId)
          .not('status', 'in', '("cancelled","refunded")')
          .limit(1);

        if (existingOrders && existingOrders.length > 0) {
          return new Response(
            JSON.stringify({ valid: false, reason: 'Este código es solo para primera compra' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Calcular descuento
    let discountAmount = 0;
    if (discountCode.type === 'percentage') {
      discountAmount = Math.floor((subtotal * discountCode.value) / 100);
      // Aplicar límite máximo si existe
      if (discountCode.max_discount_amount && discountAmount > discountCode.max_discount_amount) {
        discountAmount = discountCode.max_discount_amount;
      }
    } else {
      // Tipo fijo
      discountAmount = Math.min(discountCode.value, subtotal);
    }

    const totalAfterDiscount = subtotal - discountAmount;

    return new Response(
      JSON.stringify({
        valid: true,
        discount_code_id: discountCode.id,
        code: discountCode.code,
        type: discountCode.type,
        value: discountCode.value,
        description: discountCode.description,
        discount_amount: discountAmount,
        total_after_discount: totalAfterDiscount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating discount code:', error);
    return new Response(
      JSON.stringify({ valid: false, reason: 'Error al validar el código' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
