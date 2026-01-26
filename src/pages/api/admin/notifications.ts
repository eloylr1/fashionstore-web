/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: GET /api/admin/notifications
 * Obtiene notificaciones reales del sistema
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role?.toLowerCase() !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
    }

    const notifications: any[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Pedidos recientes (últimos 7 días)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, created_at, total_cents, status')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    recentOrders?.forEach(order => {
      const total = (order.total_cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
      const orderId = order.id.substring(0, 8);
      
      if (order.status === 'pending') {
        notifications.push({
          id: `order-pending-${order.id}`,
          type: 'order',
          title: 'Nuevo pedido recibido',
          message: `Pedido #${orderId} por ${total}`,
          timestamp: order.created_at,
          link: '/admin/pedidos'
        });
      } else if (order.status === 'shipped') {
        notifications.push({
          id: `order-shipped-${order.id}`,
          type: 'order',
          title: 'Pedido enviado',
          message: `Pedido #${orderId} marcado como enviado`,
          timestamp: order.created_at,
          link: '/admin/pedidos'
        });
      }
    });

    // 2. Productos con stock bajo
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id, name, stock, updated_at')
      .lt('stock', 10)
      .gt('stock', 0)
      .order('stock', { ascending: true })
      .limit(5);

    lowStockProducts?.forEach(product => {
      notifications.push({
        id: `stock-${product.id}`,
        type: 'stock',
        title: 'Stock bajo',
        message: `${product.name} - Solo quedan ${product.stock} unidades`,
        timestamp: product.updated_at || now.toISOString(),
        link: '/admin/productos'
      });
    });

    // 3. Productos sin stock
    const { data: outOfStockProducts } = await supabase
      .from('products')
      .select('id, name, updated_at')
      .eq('stock', 0)
      .limit(3);

    outOfStockProducts?.forEach(product => {
      notifications.push({
        id: `outofstock-${product.id}`,
        type: 'stock',
        title: 'Sin stock',
        message: `${product.name} - Agotado`,
        timestamp: product.updated_at || now.toISOString(),
        link: '/admin/productos'
      });
    });

    // 4. Nuevos clientes (últimos 7 días)
    const { data: newCustomers } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('role', 'customer')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    newCustomers?.forEach(customer => {
      notifications.push({
        id: `customer-${customer.id}`,
        type: 'customer',
        title: 'Nuevo cliente registrado',
        message: `${customer.full_name || customer.email?.split('@')[0] || 'Cliente'} se ha registrado`,
        timestamp: customer.created_at,
        link: '/admin/clientes'
      });
    });

    // Ordenar por fecha (más recientes primero)
    notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limitar a 15 notificaciones
    const limitedNotifications = notifications.slice(0, 15);

    return new Response(JSON.stringify({ 
      notifications: limitedNotifications 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
};
