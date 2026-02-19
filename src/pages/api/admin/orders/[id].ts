/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Order API (Single)
 * Endpoint para actualizar estado de pedido
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdminSecure } from '../../../../lib/supabase/server';
import { sendOrderStatusEmail } from '../../../../lib/email/index';

// GET - Obtener un pedido
export const GET: APIRoute = async ({ params, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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

    return new Response(JSON.stringify({ ...data, profiles: profile }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH - Actualizar estado del pedido
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  // Verificación segura de admin
  const auth = await verifyAdminSecure(cookies);
  if (!auth.isAdmin) return auth.error!;

  const supabase = supabaseAdmin!;

  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Estado no válido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Preparar datos de actualización (solo columnas que siempre existen)
    const updateData: Record<string, any> = { 
      status, 
      updated_at: new Date().toISOString() 
    };

    // @ts-ignore - Supabase types issue
    const { data, error } = await (supabase as any)
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Intentar actualizar timestamps opcionales (pueden no existir como columnas)
    try {
      if (status === 'shipped') {
        await (supabase as any).from('orders').update({ shipped_at: new Date().toISOString() }).eq('id', id);
      } else if (status === 'delivered') {
        await (supabase as any).from('orders').update({ delivered_at: new Date().toISOString() }).eq('id', id);
      }
    } catch (_) { /* columns may not exist */ }

    // Enviar email de notificación al cliente
    try {
      // Obtener datos del pedido
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number, user_id, guest_email, guest_name')
        .eq('id', id)
        .single();

      if (orderData) {
        // Obtener perfil por separado (FK va a auth.users, no a profiles)
        let customerEmail = (orderData as any).guest_email;
        let customerName = (orderData as any).guest_name || 'Cliente';
        const orderNumber = orderData.order_number || id.slice(0, 8);

        if ((orderData as any).user_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', (orderData as any).user_id)
            .single();
          if (prof) {
            customerEmail = (prof as any).email || customerEmail;
            customerName = (prof as any).full_name || customerName;
          }
        }

        if (customerEmail) {
          const trackingNumber = status === 'shipped' ? (body.tracking_number || data.tracking_number) : undefined;
          await sendOrderStatusEmail(customerEmail, customerName, orderNumber, status, trackingNumber);
        }
      }
    } catch (emailError) {
      // No fallar si el email no se envía, el pedido ya fue actualizado
      console.error('Error sending order status email:', emailError);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return new Response(JSON.stringify({ error: 'Error al actualizar pedido' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
