/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Crear Pedido
 * Endpoint completo para crear pedido con cualquier método de pago
 * Incluye: contrareembolso, transferencia bancaria, etc.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from '../../../lib/email';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
const siteUrl = import.meta.env.SITE_URL || 'http://localhost:4322';

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
  shipping_method?: 'standard' | 'express';
  payment_method?: string;
  discount_code_id?: string;
  discount_code?: string;
  discount_amount?: number;
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
      shipping_method = 'standard',
      payment_method = 'card',
      discount_code_id,
      discount_code,
      discount_amount = 0,
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

    // Obtener configuración de la tienda
    const { data: settingsData } = await supabase
      .from('store_settings')
      .select('category, settings')
      .in('category', ['shipping', 'payments', 'taxes']);

    const storeSettings: Record<string, any> = {
      shipping: { 
        free_shipping_threshold: 10000, 
        standard_shipping_cost: 499, 
        express_shipping_cost: 999,
        estimated_delivery_days: 3,
        express_delivery_days: 1,
      },
      payments: { 
        cod_extra_cost: 0,
        transfer_enabled: true,
        cash_on_delivery_enabled: true,
      },
      taxes: { tax_rate: 21, prices_include_tax: true },
    };

    if (settingsData) {
      for (const item of settingsData) {
        if (item.category && item.settings) {
          storeSettings[item.category] = { ...storeSettings[item.category], ...item.settings };
        }
      }
    }

    // 2) Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    
    // Calcular costo de envío según configuración
    let shipping_cost = 0;
    if (subtotal < storeSettings.shipping.free_shipping_threshold) {
      shipping_cost = shipping_method === 'express' 
        ? storeSettings.shipping.express_shipping_cost 
        : storeSettings.shipping.standard_shipping_cost;
    }

    // Costo adicional por contrareembolso
    const cod_extra_cost = payment_method === 'cash_on_delivery' 
      ? (storeSettings.payments.cod_extra_cost || 0) 
      : 0;

    const tax = 0; // IVA ya incluido en precio
    const total = subtotal - discount_amount + shipping_cost + cod_extra_cost + tax;

    // Determinar estado inicial según método de pago
    let orderStatus = 'pending';
    if (payment_method === 'transfer') {
      orderStatus = 'awaiting_payment'; // Esperando transferencia
    } else if (payment_method === 'cash_on_delivery') {
      orderStatus = 'pending'; // Pendiente de preparar, pago a la entrega
    } else if (payment_method === 'card') {
      orderStatus = 'paid'; // Pagado con tarjeta
    }

    // Generar número de pedido
    const orderNumber = `FM-${Date.now().toString(36).toUpperCase()}`;

    // 3) Crear pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        status: orderStatus,
        shipping_name: shipping_address.full_name,
        shipping_phone: shipping_address.phone,
        shipping_address_line1: shipping_address.address_line1,
        shipping_address_line2: shipping_address.address_line2 || null,
        shipping_city: shipping_address.city,
        shipping_province: shipping_address.province,
        shipping_postal_code: shipping_address.postal_code,
        shipping_country: shipping_address.country || 'España',
        shipping_method: shipping_method,
        subtotal,
        shipping_cost,
        cod_extra_cost,
        discount: discount_amount,
        discount_code: discount_code,
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

    // 7) Generar factura
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .ilike('invoice_number', `FM-${year}-%`);
    
    const invoiceNumber = `FM-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

    const invoiceStatus = payment_method === 'card' ? 'paid' : 'pending';
    
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        order_id: order.id,
        user_id: userId,
        invoice_number: invoiceNumber,
        customer_name: shipping_address.full_name,
        customer_email: sessionData.user.email,
        customer_address: shipping_address,
        subtotal,
        shipping_cost,
        cod_extra_cost,
        tax_rate: storeSettings.taxes.tax_rate,
        tax_amount: tax,
        total,
        status: invoiceStatus,
        payment_method,
        items: items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.unit_price * item.quantity,
          size: item.size,
        })),
      })
      .select()
      .single();

    // 8) Enviar email de confirmación
    const customerEmail = sessionData.user.email || '';
    const deliveryDays = shipping_method === 'express' 
      ? storeSettings.shipping.express_delivery_days 
      : storeSettings.shipping.estimated_delivery_days;

    await sendOrderConfirmationEmail({
      orderNumber: order.order_number || orderNumber,
      customerName: shipping_address.full_name,
      customerEmail,
      items: items.map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
        size: item.size || undefined,
      })),
      subtotal,
      shippingCost: shipping_cost,
      codExtraCost: cod_extra_cost,
      discount: discount_amount,
      tax,
      total,
      shippingAddress: shipping_address,
      shippingMethod: shipping_method,
      estimatedDeliveryDays: deliveryDays,
      paymentMethod: payment_method,
      invoiceNumber: invoice?.invoice_number || invoiceNumber,
      invoiceUrl: invoice ? `${siteUrl}/api/invoices/${invoice.id}` : '',
      // Datos bancarios para transferencia
      bankDetails: payment_method === 'transfer' ? {
        bank: 'Banco FashionMarket',
        iban: 'ES00 0000 0000 0000 0000 0000',
        beneficiary: 'FashionMarket S.L.',
        reference: order.order_number || orderNumber,
      } : undefined,
    });

    // Construir respuesta según método de pago
    let paymentInfo = null;
    if (payment_method === 'transfer') {
      paymentInfo = {
        type: 'transfer',
        message: 'Por favor realiza la transferencia con el número de pedido como referencia',
        bank: 'Banco FashionMarket',
        iban: 'ES00 0000 0000 0000 0000 0000',
        beneficiary: 'FashionMarket S.L.',
        reference: order.order_number || orderNumber,
        amount: total,
      };
    } else if (payment_method === 'cash_on_delivery') {
      paymentInfo = {
        type: 'cash_on_delivery',
        message: `Pagarás ${(total / 100).toFixed(2)}€ al recibir tu pedido`,
        amountDue: total,
        codExtraCost: cod_extra_cost,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number || orderNumber,
        status: orderStatus,
        total: order.total,
        shipping_cost,
        payment_method,
        shipping_method,
        estimated_delivery_days: deliveryDays,
        invoice: invoice ? {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
        } : null,
        paymentInfo,
        message: payment_method === 'transfer' 
          ? 'Pedido creado. Por favor, realiza la transferencia para confirmar.'
          : payment_method === 'cash_on_delivery'
          ? 'Pedido creado. Pagarás al recibir tu pedido.'
          : 'Pedido creado correctamente',
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
