/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Order API (Single)
 * Endpoint para actualizar estado de pedido
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabaseAdminConfigured } from '../../../../lib/supabase/server';
import { sendOrderStatusEmail } from '../../../../lib/email/index';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Verificación de admin simplificada para API routes.
 * Verifica la cookie sb-access-token y el rol del usuario.
 * Si el token expiró, intenta refrescar con sb-refresh-token.
 */
async function verifyAdminAPI(cookies: any): Promise<{ ok: boolean; userId?: string; error?: string }> {
  if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
    return { ok: false, error: 'Servidor no configurado' };
  }

  let accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken) {
    return { ok: false, error: 'No autorizado - sin token' };
  }

  // Verificar token
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    // Token expirado: intentar refresh
    if (refreshToken) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const anonUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
        if (anonUrl && anonKey) {
          const anonClient = createClient(anonUrl, anonKey);
          const { data: refreshData, error: refreshError } = await anonClient.auth.refreshSession({
            refresh_token: refreshToken,
          });
          if (refreshData?.session && !refreshError) {
            // Guardar nuevos tokens
            const maxAge = 60 * 60 * 24 * 7;
            cookies.set('sb-access-token', refreshData.session.access_token, {
              path: '/', maxAge, sameSite: 'lax', httpOnly: false,
            });
            cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
              path: '/', maxAge, sameSite: 'lax', httpOnly: false,
            });
            accessToken = refreshData.session.access_token;

            // Verificar de nuevo con el nuevo token
            const { data: { user: newUser }, error: newAuthError } = await supabaseAdmin.auth.getUser(accessToken);
            if (newAuthError || !newUser) {
              return { ok: false, error: 'Sesión inválida tras refresh' };
            }

            // Verificar rol
            const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', newUser.id).single();
            if (profile?.role?.toLowerCase() !== 'admin') {
              return { ok: false, error: 'Acceso denegado' };
            }
            return { ok: true, userId: newUser.id };
          }
        }
      } catch (e) {
        console.error('[API] Error refreshing token:', e);
      }
    }
    return { ok: false, error: 'Sesión expirada - vuelve a iniciar sesión' };
  }

  // Verificar rol admin
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role?.toLowerCase() !== 'admin') {
    return { ok: false, error: 'Acceso denegado' };
  }

  return { ok: true, userId: user.id };
}

// GET - Obtener un pedido
export const GET: APIRoute = async ({ params, cookies }) => {
  const auth = await verifyAdminAPI(cookies);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: JSON_HEADERS });
  }

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: JSON_HEADERS });
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, product_name, quantity, price, size, color, product_image
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Obtener perfil del usuario por separado (FK va a auth.users, no a profiles)
    let profile = null;
    if (data.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', data.user_id)
        .single();
      profile = profileData;
    }

    return new Response(JSON.stringify({ ...data, profiles: profile }), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    console.error('Error fetching order:', error);
    return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), { status: 404, headers: JSON_HEADERS });
  }
};

// PATCH - Actualizar estado del pedido
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const auth = await verifyAdminAPI(cookies);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers: JSON_HEADERS });
  }

  const supabase = supabaseAdmin!;
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400, headers: JSON_HEADERS });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON inválido' }), { status: 400, headers: JSON_HEADERS });
  }

  const { status } = body;
  const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: `Estado "${status}" no válido` }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    // Actualizar estado del pedido
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return new Response(JSON.stringify({ error: `Error DB: ${updateError.message}` }), { status: 500, headers: JSON_HEADERS });
    }

    // Intentar actualizar timestamps opcionales (columnas que podrían no existir)
    try {
      if (status === 'shipped') {
        await (supabase as any).from('orders').update({ shipped_at: new Date().toISOString() }).eq('id', id);
      } else if (status === 'delivered') {
        await (supabase as any).from('orders').update({ delivered_at: new Date().toISOString() }).eq('id', id);
      }
    } catch (_) { /* columns may not exist, ignore */ }

    // Enviar email de notificación al cliente (no bloquea la respuesta)
    try {
      const { data: orderData } = await (supabase as any)
        .from('orders')
        .select('order_number, user_id, guest_email, guest_name')
        .eq('id', id)
        .single();

      if (orderData) {
        let customerEmail = orderData.guest_email;
        let customerName = orderData.guest_name || 'Cliente';
        const orderNumber = orderData.order_number || id.slice(0, 8);

        if (orderData.user_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', orderData.user_id)
            .single();
          if (prof) {
            customerEmail = (prof as any).email || customerEmail;
            customerName = (prof as any).full_name || customerName;
          }
        }

        if (customerEmail) {
          const trackingNumber = status === 'shipped' ? body.tracking_number : undefined;
          await sendOrderStatusEmail(customerEmail, customerName, orderNumber, status, trackingNumber);
        }
      }
    } catch (emailError) {
      console.error('Error sending order status email (non-fatal):', emailError);
    }

    return new Response(JSON.stringify({ success: true, status }), { status: 200, headers: JSON_HEADERS });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Error interno del servidor' }), { status: 500, headers: JSON_HEADERS });
  }
};
