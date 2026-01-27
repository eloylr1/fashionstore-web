/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Admin Search
 * Búsqueda global para el panel de administración
 * Busca en productos, pedidos y clientes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { getSupabaseClient } from '../../../lib/supabase';

interface ProductResult {
  id: string;
  type: 'product';
  title: string;
  subtitle: string;
  link: string;
  stock?: number;
  price?: number;
}

interface OrderResult {
  id: string;
  type: 'order';
  title: string;
  subtitle: string;
  link: string;
  status?: string;
}

interface CustomerResult {
  id: string;
  type: 'customer';
  title: string;
  subtitle: string;
  link: string;
  ordersCount?: number;
}

type SearchResult = ProductResult | OrderResult | CustomerResult;

// Palabras clave especiales para búsquedas rápidas
const SPECIAL_KEYWORDS: Record<string, { type: string; threshold?: number; status?: string }> = {
  // Stock bajo
  'stock bajo': { type: 'low_stock', threshold: 10 },
  'poco stock': { type: 'low_stock', threshold: 10 },
  'bajo stock': { type: 'low_stock', threshold: 10 },
  'sin stock': { type: 'out_of_stock' },
  'agotado': { type: 'out_of_stock' },
  'agotados': { type: 'out_of_stock' },
  
  // Pedidos por estado
  'pedidos pendientes': { type: 'orders_by_status', status: 'pending' },
  'pendientes': { type: 'orders_by_status', status: 'pending' },
  'pedidos procesando': { type: 'orders_by_status', status: 'processing' },
  'procesando': { type: 'orders_by_status', status: 'processing' },
  'pedidos enviados': { type: 'orders_by_status', status: 'shipped' },
  'enviados': { type: 'orders_by_status', status: 'shipped' },
  'pedidos entregados': { type: 'orders_by_status', status: 'delivered' },
  'entregados': { type: 'orders_by_status', status: 'delivered' },
  'pedidos cancelados': { type: 'orders_by_status', status: 'cancelled' },
  'cancelados': { type: 'orders_by_status', status: 'cancelled' },
  'pedidos pagados': { type: 'orders_by_status', status: 'paid' },
  'pagados': { type: 'orders_by_status', status: 'paid' },
  
  // Productos destacados
  'destacados': { type: 'featured_products' },
  'productos destacados': { type: 'featured_products' },
  
  // Clientes
  'clientes': { type: 'all_customers' },
  'todos los clientes': { type: 'all_customers' },
  
  // Últimos pedidos
  'últimos pedidos': { type: 'recent_orders' },
  'pedidos recientes': { type: 'recent_orders' },
  'nuevos pedidos': { type: 'recent_orders' },
};

// Tipos para los resultados de Supabase
interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  role?: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Obtener cliente de Supabase
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Supabase no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar autenticación admin
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar rol admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((profile as { role?: string } | null)?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener parámetros
    const query = url.searchParams.get('q')?.trim().toLowerCase() || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '15'), 30);

    if (!query) {
      return new Response(
        JSON.stringify({ products: [], orders: [], customers: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results: SearchResult[] = [];

    // Verificar si es una búsqueda especial
    const specialSearch = Object.entries(SPECIAL_KEYWORDS).find(([keyword]) => 
      query.includes(keyword)
    );

    if (specialSearch) {
      const [, config] = specialSearch;
      
      switch (config.type) {
        case 'low_stock': {
          // Productos con stock bajo
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price, stock')
            .lt('stock', config.threshold || 10)
            .gt('stock', 0)
            .order('stock', { ascending: true })
            .limit(limit);

          if (products) {
            (products as ProductRow[]).forEach((p) => {
              results.push({
                id: p.id,
                type: 'product',
                title: p.name,
                subtitle: `Stock: ${p.stock} unidades - ${(p.price / 100).toFixed(2)}€`,
                link: `/admin/productos/${p.id}`,
                stock: p.stock,
                price: p.price
              });
            });
          }
          break;
        }

        case 'out_of_stock': {
          // Productos sin stock
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price, stock')
            .eq('stock', 0)
            .order('name', { ascending: true })
            .limit(limit);

          if (products) {
            (products as ProductRow[]).forEach((p) => {
              results.push({
                id: p.id,
                type: 'product',
                title: p.name,
                subtitle: `Sin stock - ${(p.price / 100).toFixed(2)}€`,
                link: `/admin/productos/${p.id}`,
                stock: 0,
                price: p.price
              });
            });
          }
          break;
        }

        case 'orders_by_status': {
          // Pedidos por estado
          const statusLabels: Record<string, string> = {
            pending: 'Pendiente',
            paid: 'Pagado',
            processing: 'Procesando',
            shipped: 'Enviado',
            delivered: 'Entregado',
            cancelled: 'Cancelado'
          };

          const { data: orders } = await supabase
            .from('orders')
            .select(`
              id, 
              order_number, 
              total, 
              status, 
              created_at,
              profiles:user_id (full_name, email)
            `)
            .eq('status', config.status || 'pending')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (orders) {
            (orders as unknown as OrderRow[]).forEach((o) => {
              const customerName = o.profiles?.full_name || o.profiles?.email || 'Cliente';
              results.push({
                id: o.id,
                type: 'order',
                title: `Pedido #${o.order_number}`,
                subtitle: `${customerName} - €${(o.total / 100).toFixed(2)} - ${statusLabels[o.status] || o.status}`,
                link: `/admin/pedidos/${o.id}`,
                status: o.status
              });
            });
          }
          break;
        }

        case 'featured_products': {
          // Productos destacados
          const { data: products } = await supabase
            .from('products')
            .select('id, name, price, stock')
            .eq('featured', true)
            .order('name', { ascending: true })
            .limit(limit);

          if (products) {
            (products as ProductRow[]).forEach((p) => {
              results.push({
                id: p.id,
                type: 'product',
                title: p.name,
                subtitle: `${(p.price / 100).toFixed(2)}€ - Stock: ${p.stock} - Destacado`,
                link: `/admin/productos/${p.id}`,
                stock: p.stock,
                price: p.price
              });
            });
          }
          break;
        }

        case 'all_customers': {
          // Todos los clientes
          const { data: customers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'customer')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (customers) {
            for (const c of (customers as ProfileRow[])) {
              // Contar pedidos de cada cliente
              const { count } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', c.id);

              results.push({
                id: c.id,
                type: 'customer',
                title: c.full_name || 'Sin nombre',
                subtitle: `${c.email} - ${count || 0} pedidos`,
                link: `/admin/clientes/${c.id}`,
                ordersCount: count || 0
              });
            }
          }
          break;
        }

        case 'recent_orders': {
          // Pedidos recientes
          const statusLabels: Record<string, string> = {
            pending: 'Pendiente',
            paid: 'Pagado',
            processing: 'Procesando',
            shipped: 'Enviado',
            delivered: 'Entregado',
            cancelled: 'Cancelado'
          };

          const { data: orders } = await supabase
            .from('orders')
            .select(`
              id, 
              order_number, 
              total, 
              status, 
              created_at,
              profiles:user_id (full_name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (orders) {
            (orders as unknown as OrderRow[]).forEach((o) => {
              const customerName = o.profiles?.full_name || o.profiles?.email || 'Cliente';
              const date = new Date(o.created_at).toLocaleDateString('es-ES');
              results.push({
                id: o.id,
                type: 'order',
                title: `Pedido #${o.order_number}`,
                subtitle: `${customerName} - €${(o.total / 100).toFixed(2)} - ${statusLabels[o.status] || o.status} (${date})`,
                link: `/admin/pedidos/${o.id}`,
                status: o.status
              });
            });
          }
          break;
        }
      }
    } else {
      // Búsqueda normal por texto

      // 1. Buscar productos
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name', { ascending: true })
        .limit(Math.ceil(limit / 2));

      if (products) {
        (products as ProductRow[]).forEach((p) => {
          const stockWarning = p.stock < 10 ? 'Stock bajo - ' : '';
          results.push({
            id: p.id,
            type: 'product',
            title: p.name,
            subtitle: `${stockWarning}${(p.price / 100).toFixed(2)}€ - Stock: ${p.stock}`,
            link: `/admin/productos/${p.id}`,
            stock: p.stock,
            price: p.price
          });
        });
      }

      // 2. Buscar pedidos por número de pedido
      const isOrderNumber = /^\d+$/.test(query) || query.includes('#');
      const orderQuery = query.replace('#', '');
      
      if (isOrderNumber || query.includes('pedido')) {
        const statusLabels: Record<string, string> = {
          pending: 'Pendiente',
          paid: 'Pagado',
          processing: 'Procesando',
          shipped: 'Enviado',
          delivered: 'Entregado',
          cancelled: 'Cancelado'
        };

        const { data: orders } = await supabase
          .from('orders')
          .select(`
            id, 
            order_number, 
            total, 
            status,
            profiles:user_id (full_name, email)
          `)
          .ilike('order_number', `%${orderQuery}%`)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 3));

        if (orders) {
          (orders as unknown as OrderRow[]).forEach((o) => {
            const customerName = o.profiles?.full_name || o.profiles?.email || 'Cliente';
            results.push({
              id: o.id,
              type: 'order',
              title: `Pedido #${o.order_number}`,
              subtitle: `${customerName} - ${(o.total / 100).toFixed(2)}€ - ${statusLabels[o.status] || o.status}`,
              link: `/admin/pedidos/${o.id}`,
              status: o.status
            });
          });
        }
      }

      // 3. Buscar clientes por nombre o email
      const { data: customers } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'customer')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('full_name', { ascending: true })
        .limit(Math.ceil(limit / 3));

      if (customers) {
        for (const c of (customers as ProfileRow[])) {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', c.id);

          results.push({
            id: c.id,
            type: 'customer',
            title: c.full_name || 'Sin nombre',
            subtitle: `${c.email} - ${count || 0} pedidos`,
            link: `/admin/clientes/${c.id}`,
            ordersCount: count || 0
          });
        }
      }
    }

    // Ordenar resultados: productos primero, luego pedidos, luego clientes
    results.sort((a, b) => {
      const typeOrder = { product: 0, order: 1, customer: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    return new Response(
      JSON.stringify({ 
        results: results.slice(0, limit),
        query,
        isSpecialSearch: !!specialSearch
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Admin search error:', error);
    return new Response(
      JSON.stringify({ error: 'Error en la búsqueda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
