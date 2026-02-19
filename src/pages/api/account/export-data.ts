/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Exportar datos del usuario (RGPD - Derecho de portabilidad)
 * Genera un JSON con todos los datos personales del usuario
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar sesión
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = sessionData.user.id;
    const userEmail = sessionData.user.email;

    // Recopilar todos los datos del usuario en paralelo
    const [
      profileResult,
      ordersResult,
      addressesResult,
      paymentMethodsResult,
      returnsResult,
      invoicesResult,
      creditNotesResult,
      newsletterResult,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
      supabaseAdmin.from('orders').select('*, order_items(*)').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseAdmin.from('addresses').select('*').eq('user_id', userId),
      supabaseAdmin.from('payment_methods').select('id, card_brand, card_last4, expiry_month, expiry_year, type, is_default, created_at').eq('user_id', userId),
      supabaseAdmin.from('returns').select('*').eq('user_id', userId),
      supabaseAdmin.from('invoices').select('*').eq('user_id', userId),
      supabaseAdmin.from('credit_notes').select('*').eq('user_id', userId),
      supabaseAdmin.from('newsletter_subscriptions').select('email, subscribed_at, is_active').eq('email', userEmail || ''),
    ]);

    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        email: userEmail,
        description: 'Exportación completa de datos personales conforme al RGPD (derecho de portabilidad)',
      },
      profile: profileResult.data || null,
      orders: ordersResult.data || [],
      addresses: (addressesResult.data || []).map((a: any) => ({
        ...a,
        // No incluir datos internos innecesarios
      })),
      payment_methods: paymentMethodsResult.data || [],
      returns: returnsResult.data || [],
      invoices: invoicesResult.data || [],
      credit_notes: creditNotesResult.data || [],
      newsletter: newsletterResult.data || [],
    };

    const fileName = `fashionmarket-datos-${userId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting user data:', error);
    return new Response(JSON.stringify({ error: 'Error al exportar los datos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
