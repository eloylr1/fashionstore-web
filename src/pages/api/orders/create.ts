/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Crear Pedido
 * Endpoint completo para crear pedido, actualizar stock y aplicar descuento
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface CartItem {
  product_id: string;
  product_name: string;
  product_image: string | null;
  product_slug: string | null;
  quantity: number;
  size: string | null;
  color: string | null;
  unit_price: number; // En céntimos
}

interface ShippingAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  country?: string;
}

interface CreateOrderRequest {
  items: CartItem[];
  shipping_address: ShippingAddress;
  payment_method?: string;
  discount_code_id?: string;
  discount_amount?: number;
  shipping_cost?: number;
  notes?: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Debes iniciar sesión para realizar un pedido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente con token del usuario para obtener el user_id
    const anonClient = createClient(
      supabaseUrl,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    const { data: sessionData, error: sessionError } = await anonClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida. Por favor, inicia sesión de nuevo.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = sessionData.user.id;

    // Parsear body
    const body: CreateOrderRequest = await request.json();
    const { 
      items, 
      shipping_address, 
      payment_method = 'card',
      discount_code_id,
      discount_amount = 0,
      shipping_cost = 0,
      notes 
    } = body;

    // Validaciones
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'El carrito está vacío' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!shipping_address || !shipping_address.full_name || !shipping_address.address_line1) {
      return new Response(
        JSON.stringify({ error: 'Dirección de envío incompleta' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente con service role para operaciones admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Verificar stock disponible para todos los items
    const productIds = items.map(i => i.product_id);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, stock, price')
      .in('id', productIds);

    if (productError || !products) {
      console.error('Error fetching products:', productError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar productos' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear mapa de productos para validación
    const productMap = new Map(products.map(p => [p.id, p]));

    // Verificar stock
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Producto no encontrado: ${item.product_name}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (product.stock < item.quantity) {
        return new Response(
          JSON.stringify({ 
            error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2) Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax = 0; // IVA ya incluido en precio
    const total = subtotal - discount_amount + shipping_cost + tax;

    // 3) Crear pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        shipping_name: shipping_address.full_name,
        shipping_phone: shipping_address.phone,
        shipping_address_line1: shipping_address.address_line1,
        shipping_address_line2: shipping_address.address_line2 || null,
        shipping_city: shipping_address.city,
        shipping_province: shipping_address.province,
        shipping_postal_code: shipping_address.postal_code,
        shipping_country: shipping_address.country || 'España',
        subtotal,
        shipping_cost,
        discount: discount_amount,
        tax,
        total,
        payment_method,
        notes,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Error al crear el pedido' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4) Crear order_items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image,
      product_slug: item.product_slug,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: eliminar el pedido creado
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ error: 'Error al procesar los items del pedido' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5) Reducir stock de cada producto
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });

      // Si no existe la función RPC, hacerlo manualmente
      if (stockError) {
        const product = productMap.get(item.product_id);
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock - item.quantity })
            .eq('id', item.product_id);
        }
      }
    }

    // 6) Si hay código de descuento, registrar uso e incrementar contador
    if (discount_code_id && discount_amount > 0) {
      // Registrar canje
      await supabase
        .from('discount_code_redemptions')
        .insert({
          code_id: discount_code_id,
          user_id: userId,
          order_id: order.id,
          discount_amount,
        })
        .single();

      // Incrementar contador de usos
      await supabase.rpc('increment', { x: 1, row_id: discount_code_id });

      // Si no existe la función, hacer update manual
      const { data: discountCode } = await supabase
        .from('discount_codes')
        .select('uses_count')
        .eq('id', discount_code_id)
        .single();

      if (discountCode) {
        await supabase
          .from('discount_codes')
          .update({ uses_count: (discountCode.uses_count || 0) + 1 })
          .eq('id', discount_code_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        total: order.total,
        message: 'Pedido creado correctamente',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error creating order:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado al procesar el pedido' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
