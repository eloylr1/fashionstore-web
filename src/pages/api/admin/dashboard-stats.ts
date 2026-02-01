/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Dashboard Stats (COMPLETO)
 * Endpoint unificado para todas las métricas del dashboard admin
 * Incluye: productos, pedidos, ingresos, clientes, stock, ventas diarias
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // ═══════════════════════════════════════════════════════════════════
    // VERIFICACIÓN DE ADMIN
    // ═══════════════════════════════════════════════════════════════════
    const accessToken = cookies.get('sb-access-token')?.value;
    const userRole = cookies.get('user-role')?.value;

    if (!accessToken || userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con service role para acceso completo
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ═══════════════════════════════════════════════════════════════════
    // CALCULAR FECHAS
    // ═══════════════════════════════════════════════════════════════════
    const now = new Date();
    
    // Primer día del mes actual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Mes anterior para comparación
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Últimos 7 días
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }
    const startOf7Days = last7Days[0] + 'T00:00:00.000Z';

    // ═══════════════════════════════════════════════════════════════════
    // EJECUTAR TODAS LAS CONSULTAS EN PARALELO
    // ═══════════════════════════════════════════════════════════════════
    const [
      // Conteos básicos
      productsResult,
      lowStockResult,
      customersResult,
      totalOrdersResult,
      
      // Ventas y pedidos del mes
      monthOrdersResult,
      pendingOrdersResult,
      
      // Ventas mes anterior (para comparación)
      lastMonthOrdersResult,
      
      // Ventas últimos 7 días
      last7DaysOrdersResult,
      
      // Pedidos recientes
      recentOrdersResult,
      
      // Productos con stock bajo
      lowStockProductsResult,
    ] = await Promise.all([
      // Total productos
      supabase.from('products').select('*', { count: 'exact', head: true }),
      
      // Productos con stock bajo (<10)
      supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock', 10),
      
      // Total clientes (solo rol customer)
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      
      // Total pedidos
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      
      // Pedidos del mes (pagados, enviados, entregados)
      supabase.from('orders')
        .select('id, total')
        .gte('created_at', startOfMonthISO)
        .in('status', ['paid', 'shipped', 'delivered', 'processing']),
      
      // Pedidos pendientes
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      
      // Pedidos mes anterior
      supabase.from('orders')
        .select('total')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())
        .in('status', ['paid', 'shipped', 'delivered', 'processing']),
      
      // Pedidos últimos 7 días
      supabase.from('orders')
        .select('created_at, total')
        .gte('created_at', startOf7Days)
        .in('status', ['paid', 'shipped', 'delivered', 'processing']),
      
      // Últimos 5 pedidos
      supabase.from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          created_at,
          shipping_name,
          shipping_email,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Productos con stock bajo (detalle)
      supabase.from('products')
        .select('id, name, stock, images, slug')
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .limit(5),
    ]);

    // ═══════════════════════════════════════════════════════════════════
    // PROCESAR RESULTADOS
    // ═══════════════════════════════════════════════════════════════════
    
    // Conteos
    const productsCount = productsResult.count || 0;
    const lowStockCount = lowStockResult.count || 0;
    const customersCount = customersResult.count || 0;
    const totalOrdersCount = totalOrdersResult.count || 0;
    const pendingOrdersCount = pendingOrdersResult.count || 0;

    // Ingresos del mes
    const monthSalesCents = monthOrdersResult.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const monthOrdersCount = monthOrdersResult.data?.length || 0;

    // Ingresos mes anterior
    const lastMonthSalesCents = lastMonthOrdersResult.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    // Calcular variación porcentual
    let salesChangePercent = 0;
    if (lastMonthSalesCents > 0) {
      salesChangePercent = Math.round(((monthSalesCents - lastMonthSalesCents) / lastMonthSalesCents) * 100);
    } else if (monthSalesCents > 0) {
      salesChangePercent = 100;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRODUCTO MÁS VENDIDO DEL MES
    // ═══════════════════════════════════════════════════════════════════
    let topProductName = 'Sin datos';
    let topProductUnits = 0;

    if (monthOrdersResult.data && monthOrdersResult.data.length > 0) {
      const orderIds = monthOrdersResult.data.map(o => o.id);
      
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity')
        .in('order_id', orderIds);

      if (orderItems && orderItems.length > 0) {
        const productSales: Record<string, { name: string; units: number }> = {};
        
        for (const item of orderItems) {
          const key = item.product_id || item.product_name;
          if (!productSales[key]) {
            productSales[key] = { name: item.product_name, units: 0 };
          }
          productSales[key].units += item.quantity;
        }

        let maxUnits = 0;
        for (const key in productSales) {
          if (productSales[key].units > maxUnits) {
            maxUnits = productSales[key].units;
            topProductName = productSales[key].name;
            topProductUnits = maxUnits;
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // VENTAS POR DÍA (ÚLTIMOS 7 DÍAS)
    // ═══════════════════════════════════════════════════════════════════
    const dailySales: Record<string, number> = {};
    for (const day of last7Days) {
      dailySales[day] = 0;
    }

    if (last7DaysOrdersResult.data) {
      for (const order of last7DaysOrdersResult.data) {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (dailySales[orderDate] !== undefined) {
          dailySales[orderDate] += order.total || 0;
        }
      }
    }

    const chartData = last7Days.map(date => ({
      date,
      salesCents: dailySales[date]
    }));

    // ═══════════════════════════════════════════════════════════════════
    // INGRESOS TOTALES (todos los pedidos completados históricos)
    // ═══════════════════════════════════════════════════════════════════
    const { data: allCompletedOrders } = await supabase
      .from('orders')
      .select('total')
      .in('status', ['paid', 'shipped', 'delivered', 'processing']);

    const totalRevenueCents = allCompletedOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    // ═══════════════════════════════════════════════════════════════════
    // FORMATEAR PEDIDOS RECIENTES
    // ═══════════════════════════════════════════════════════════════════
    const recentOrders = (recentOrdersResult.data || []).map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      customerName: order.shipping_name || 'Cliente',
      customerEmail: order.shipping_email || '',
    }));

    // Productos con stock bajo
    const lowStockProducts = (lowStockProductsResult.data || []).map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      image: p.images?.[0] || '/placeholder.jpg',
      slug: p.slug,
    }));

    // ═══════════════════════════════════════════════════════════════════
    // RESPUESTA COMPLETA
    // ═══════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        // Contadores principales
        stats: {
          products: productsCount,
          orders: totalOrdersCount,
          customers: customersCount,
          lowStock: lowStockCount,
          pendingOrders: pendingOrdersCount,
        },
        
        // Ingresos
        revenue: {
          totalCents: totalRevenueCents,
          monthCents: monthSalesCents,
          lastMonthCents: lastMonthSalesCents,
          changePercent: salesChangePercent,
        },
        
        // KPIs del mes
        kpis: {
          monthSalesCents,
          monthOrdersCount,
          pendingCount: pendingOrdersCount,
          topProductName,
          topProductUnits,
        },
        
        // Gráfico de ventas
        chartData,
        
        // Listas
        recentOrders,
        lowStockProducts,
        
        // Metadata
        lastUpdated: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('Error en dashboard-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
