/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Guardar método de pago
 * Guarda un método de pago de Stripe en la base de datos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      console.error('Missing tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
      return new Response(
        JSON.stringify({ error: 'No autenticado. Por favor, inicia sesión nuevamente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false
        }
      }
    );

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      console.error('Session error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sesión inválida. Por favor, inicia sesión nuevamente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { paymentMethodId, brand, last4, expMonth, expYear, userId } = await request.json();

    // Usar el userId del body si las cookies fallan
    const finalUserId = sessionData?.user?.id || userId;

    if (!finalUserId) {
      return new Response(
        JSON.stringify({ error: 'No se pudo identificar al usuario' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving payment method for user:', finalUserId);

    // Insertar en base de datos
    const { data, error: insertError } = await (supabase as any)
      .from('payment_methods')
      .insert({
        user_id: finalUserId,
        type: 'card',
        card_brand: brand,
        card_last4: last4,
        expiry_month: expMonth,
        expiry_year: expYear,
        is_default: false,
      })
      .select();

    if (insertError) {
      console.error('Error inserting payment method:', insertError);
      return new Response(
        JSON.stringify({ error: `Error al guardar: ${insertError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment method saved successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error saving payment method:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al procesar la solicitud' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
