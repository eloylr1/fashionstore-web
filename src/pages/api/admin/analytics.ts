/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Admin Analytics
 * Endpoint protegido para obtener KPIs y datos de ventas
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

    // Últimos 7 días
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
    }
    const startOf7Days = last7Days[0] + 'T00:00:00.000Z';

    // ═══════════════════════════════════════════════════════════════════
    // KPI 1: VENTAS TOTALES DEL MES (status 'paid', 'shipped', 'delivered')
    // ═══════════════════════════════════════════════════════════════════
    const { data: monthSalesData } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', startOfMonthISO)
      .in('status', ['paid', 'shipped', 'delivered']);

    const monthSalesCents = monthSalesData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

    // ═══════════════════════════════════════════════════════════════════
    // KPI 2: PEDIDOS PENDIENTES
    // ═══════════════════════════════════════════════════════════════════
    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // ═══════════════════════════════════════════════════════════════════
    // KPI 3: PRODUCTO MÁS VENDIDO (último mes)
    // ═══════════════════════════════════════════════════════════════════
    // Obtener order_items de pedidos del mes con estado válido
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', startOfMonthISO)
      .in('status', ['paid', 'shipped', 'delivered']);

    let topProductName = 'Sin datos';
    let topProductUnits = 0;

    if (monthOrders && monthOrders.length > 0) {
      const orderIds = monthOrders.map(o => o.id);
      
      // Obtener order_items de esos pedidos
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity')
        .in('order_id', orderIds);

      if (orderItems && orderItems.length > 0) {
        // Agrupar por producto y sumar cantidades
        const productSales: Record<string, { name: string; units: number }> = {};
        
        for (const item of orderItems) {
          const key = item.product_id || item.product_name;
          if (!productSales[key]) {
            productSales[key] = { name: item.product_name, units: 0 };
          }
          productSales[key].units += item.quantity;
        }

        // Encontrar el más vendido
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
    // DATOS PARA GRÁFICO: VENTAS ÚLTIMOS 7 DÍAS
    // ═══════════════════════════════════════════════════════════════════
    const { data: last7DaysOrders } = await supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', startOf7Days)
      .in('status', ['paid', 'shipped', 'delivered']);

    // Inicializar todos los días con 0
    const dailySales: Record<string, number> = {};
    for (const day of last7Days) {
      dailySales[day] = 0;
    }

    // Sumar ventas por día
    if (last7DaysOrders) {
      for (const order of last7DaysOrders) {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (dailySales[orderDate] !== undefined) {
          dailySales[orderDate] += order.total || 0;
        }
      }
    }

    // Convertir a array para el frontend
    const last7DaysData = last7Days.map(date => ({
      date,
      salesCents: dailySales[date]
    }));

    // ═══════════════════════════════════════════════════════════════════
    // RESPUESTA
    // ═══════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        kpis: {
          monthSalesCents,
          pendingCount: pendingCount || 0,
          topProductName,
          topProductUnits
        },
        last7Days: last7DaysData
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60' // Cache 1 minuto
        } 
      }
    );

  } catch (error) {
    console.error('Error en analytics:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
