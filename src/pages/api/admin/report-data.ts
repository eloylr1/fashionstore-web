/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: GET /api/admin/report-data
 * Obtiene todos los datos necesarios para generar reportes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const GET: APIRoute = async ({ cookies }) => {
  // Verificar autenticación admin
  const token = cookies.get('sb-access-token')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado - Sin token' }), { status: 401 });
  }

  try {
    // Obtener usuario y verificar rol admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'No autorizado - Token inválido' }), { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('User ID:', user.id, 'Profile role:', profile?.role, 'Profile error:', profileError);

    // Verificar si es admin (también acepta 'Admin' o 'ADMIN')
    const isAdmin = profile?.role?.toLowerCase() === 'admin';
    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: `Acceso denegado - Rol: ${profile?.role || 'sin rol'}` 
      }), { status: 403 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OBTENER DATOS
    // ═══════════════════════════════════════════════════════════════════════

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // KPIs del mes
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total_cents, status')
      .gte('created_at', firstDayOfMonth);

    const monthSalesCents = monthOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;
    const pendingCount = monthOrders?.filter(o => o.status === 'pending').length || 0;

    // Totales generales
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Producto más vendido
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price_cents, products(name)');

    const productSales: Record<string, { name: string; units: number; revenue: number }> = {};
    orderItems?.forEach((item: any) => {
      const id = item.product_id;
      const name = item.products?.name || 'Producto';
      if (!productSales[id]) {
        productSales[id] = { name, units: 0, revenue: 0 };
      }
      productSales[id].units += item.quantity || 0;
      productSales[id].revenue += (item.unit_price_cents || 0) * (item.quantity || 0);
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    const topProduct = topProducts[0] || { name: 'Sin datos', units: 0 };

    // Ventas últimos 7 días
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('created_at, total_cents')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    const salesByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      salesByDay[dateStr] = 0;
    }

    recentOrders?.forEach((order: any) => {
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      if (salesByDay.hasOwnProperty(dateStr)) {
        salesByDay[dateStr] += order.total_cents || 0;
      }
    });

    const salesByDayArray = Object.entries(salesByDay).map(([date, sales]) => ({ date, sales }));

    // Pedidos recientes para el reporte
    const { data: ordersForReport } = await supabase
      .from('orders')
      .select('id, created_at, total_cents, status, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(20);

    const formattedOrders = ordersForReport?.map((o: any) => ({
      id: o.id,
      date: o.created_at,
      customer: o.profiles?.full_name || o.profiles?.email || 'Cliente',
      total: o.total_cents || 0,
      status: translateStatus(o.status),
    })) || [];

    // ═══════════════════════════════════════════════════════════════════════
    // RESPUESTA
    // ═══════════════════════════════════════════════════════════════════════

    return new Response(JSON.stringify({
      kpis: {
        monthSalesCents,
        pendingCount,
        topProductName: topProduct.name,
        topProductUnits: topProduct.units,
        totalOrders: totalOrders || 0,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
      },
      salesByDay: salesByDayArray,
      topProducts: topProducts.map(p => ({
        name: p.name,
        units: p.units,
        revenue: p.revenue,
      })),
      recentOrders: formattedOrders,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
};

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'pending': 'Pendiente',
    'processing': 'Procesando',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado',
  };
  return translations[status] || status;
}
