/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Crear Solicitud de Devolución
 * POST: El cliente crea una devolución para un pedido entregado
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken || !supabaseAdmin) {
      return json({ success: false, error: 'No autenticado' }, 401);
    }

    // Obtener usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !user) {
      return json({ success: false, error: 'Sesión no válida' }, 401);
    }

    // Parsear body
    const body = await request.json();
    const { order_id, reason, description, items } = body;

    if (!order_id || !reason) {
      return json({ success: false, error: 'Faltan campos obligatorios (order_id, reason)' }, 400);
    }

    // Validar motivo
    const validReasons = ['wrong_size', 'defective', 'not_as_described', 'changed_mind', 'other'];
    if (!validReasons.includes(reason)) {
      return json({ success: false, error: 'Motivo no válido' }, 400);
    }

    // Verificar que el pedido existe, pertenece al usuario y está entregado
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('orders')
      .select('id, order_number, status, total, user_id, delivered_at')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return json({ success: false, error: 'Pedido no encontrado' }, 404);
    }

    if (order.user_id !== user.id) {
      return json({ success: false, error: 'No tienes permiso para devolver este pedido' }, 403);
    }

    if (order.status !== 'delivered') {
      return json({ success: false, error: 'Solo se pueden devolver pedidos entregados' }, 400);
    }

    // Verificar plazo de 30 días
    if (order.delivered_at) {
      const deliveredDate = new Date(order.delivered_at);
      const thirtyDaysLater = new Date(deliveredDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() > thirtyDaysLater) {
        return json({ success: false, error: 'Ha expirado el plazo de 30 días para devoluciones' }, 400);
      }
    }

    // Verificar que no haya ya una devolución activa para este pedido
    const { data: existingReturn } = await supabaseAdmin
      .from('returns')
      .select('id, status')
      .eq('order_id', order_id)
      .not('status', 'eq', 'rejected')
      .limit(1);

    if (existingReturn && existingReturn.length > 0) {
      return json({ success: false, error: 'Ya existe una solicitud de devolución activa para este pedido' }, 400);
    }

    // Obtener items del pedido
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('id, product_name, quantity, unit_price, size, color')
      .eq('order_id', order_id);

    if (!orderItems || orderItems.length === 0) {
      return json({ success: false, error: 'No se encontraron productos en el pedido' }, 400);
    }

    // Calcular monto de reembolso
    let refundAmount = order.total;

    // Si el cliente seleccionó items específicos, calcular solo esos
    let selectedItems = orderItems;
    if (items && Array.isArray(items) && items.length > 0) {
      selectedItems = orderItems.filter((oi: any) => items.includes(oi.id));
      if (selectedItems.length > 0) {
        refundAmount = selectedItems.reduce((sum: number, item: any) => 
          sum + (item.unit_price * item.quantity), 0);
      }
    }

    // Crear la devolución (return_number se genera por trigger)
    const { data: newReturn, error: returnError } = await (supabaseAdmin as any)
      .from('returns')
      .insert({
        order_id,
        user_id: user.id,
        status: 'requested',
        reason,
        description: description || null,
        refund_amount: refundAmount,
        refund_method: 'original',
      })
      .select()
      .single();

    if (returnError) {
      console.error('Error creating return:', returnError);
      return json({ success: false, error: 'Error al crear la devolución' }, 500);
    }

    // Crear return_items
    const returnItems = selectedItems.map((item: any) => ({
      return_id: newReturn.id,
      order_item_id: item.id,
      quantity: item.quantity,
      reason: reason,
    }));

    const { error: returnItemsError } = await (supabaseAdmin as any)
      .from('return_items')
      .insert(returnItems);

    if (returnItemsError) {
      console.error('Error creating return items:', returnItemsError);
      // No fallar por esto, la devolución ya fue creada
    }

    return json({
      success: true,
      message: 'Solicitud de devolución creada correctamente',
      return_id: newReturn.id,
      return_number: newReturn.return_number,
      refund_amount: refundAmount,
    });

  } catch (error: any) {
    console.error('Error in returns/create:', error);
    return json({ success: false, error: error.message || 'Error inesperado' }, 500);
  }
};
