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
    const body = await request.json();
    const { paymentMethodId, brand, last4, expMonth, expYear, userId } = body;

    // Si no hay userId en el body, verificar las cookies
    let finalUserId = userId;
    
    if (!finalUserId) {
      const accessToken = cookies.get('sb-access-token')?.value;
      const refreshToken = cookies.get('sb-refresh-token')?.value;
      
      if (accessToken && refreshToken) {
        const supabaseClient = createClient(
          import.meta.env.PUBLIC_SUPABASE_URL,
          import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
          { auth: { persistSession: false } }
        );
        
        const { data: sessionData } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionData?.user) {
          finalUserId = sessionData.user.id;
        }
      }
    }

    // Si sigue sin haber userId, error
    if (!finalUserId) {
      console.error('No user ID available');
      return new Response(
        JSON.stringify({ error: 'No autenticado. Por favor, inicia sesión nuevamente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving payment method for user:', finalUserId);
    
    // Usar service role para operaciones de BD (más seguro)
    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Insertar en base de datos usando el cliente admin
    const { data, error: insertError } = await supabaseAdmin
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
