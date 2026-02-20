/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Delete Account Endpoint
 * Elimina permanentemente la cuenta del usuario autenticado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const DELETE: APIRoute = async ({ cookies, request }) => {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Error de configuración del servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener token del usuario
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar el token y obtener el usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Verificar que no sea admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'admin') {
      return new Response(JSON.stringify({ error: 'Las cuentas de administrador no se pueden eliminar desde aquí' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Eliminar datos relacionados del usuario (en orden por dependencias FK)
    // Los pedidos e invoices se mantienen por requisitos legales, solo se desvinculan

    // 1. Eliminar direcciones
    await supabase.from('addresses').delete().eq('user_id', userId);

    // 2. Eliminar items del carrito
    await supabase.from('cart_items').delete().eq('user_id', userId);

    // 3. Eliminar wishlist
    await supabase.from('wishlist').delete().eq('user_id', userId);

    // 4. Eliminar suscripciones newsletter
    await supabase.from('newsletter_subscribers').delete().eq('user_id', userId);

    // 5. Anonimizar pedidos (mantener para contabilidad, pero desvincular)
    await supabase
      .from('orders')
      .update({ user_id: null, customer_email: 'deleted@account.removed' })
      .eq('user_id', userId);

    // 6. Anonimizar facturas
    await supabase
      .from('invoices')
      .update({ user_id: null })
      .eq('user_id', userId);

    // 7. Anonimizar facturas rectificativas
    await supabase
      .from('credit_notes')
      .update({ user_id: null })
      .eq('user_id', userId);

    // 8. Eliminar perfil
    await supabase.from('profiles').delete().eq('id', userId);

    // 9. Eliminar usuario de auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[DELETE-ACCOUNT] Error eliminando usuario de auth:', deleteError);
      return new Response(JSON.stringify({ error: 'Error al eliminar la cuenta. Inténtalo de nuevo.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 10. Limpiar cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    cookies.delete('user-role', { path: '/' });

    console.log(`[DELETE-ACCOUNT] Cuenta eliminada: ${userId}`);

    return new Response(JSON.stringify({ success: true, message: 'Cuenta eliminada correctamente' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[DELETE-ACCOUNT] Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
