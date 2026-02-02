/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Crear Pedido
 * Endpoint completo para crear pedido con cualquier método de pago
 * Incluye: contrareembolso, transferencia bancaria, etc.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../lib/email';

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
  payment_intent_id?: string;
  discount_code_id?: string;
  discount_code?: string;
  discount_amount?: number;
  customer_email?: string; // Para compras como invitado
  notes?: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Intentar obtener usuario autenticado (opcional)
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    let userId: string | null = null;
    let userEmail: string | null = null;

    // Crear cliente con service role para operaciones
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Si hay tokens, intentar autenticación
    if (accessToken && refreshToken) {
      const anonClient = createClient(
        supabaseUrl,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data: sessionData } = await anonClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionData?.user) {
        userId = sessionData.user.id;
        userEmail = sessionData.user.email || null;
        console.log('✅ Usuario autenticado:', userId, userEmail);
      } else {
        console.log('⚠️ No se pudo autenticar usuario con tokens');
      }
    } else {
      console.log('⚠️ No hay tokens de sesión');
    }

    // Parsear body
    const body: CreateOrderRequest = await request.json();
    const { 
      items, 
      shipping_address, 
      shipping_method = 'standard',
      payment_method = 'card',
      payment_intent_id,
      discount_code_id,
      discount_code,
      discount_amount = 0,
      customer_email,
      notes 
    } = body;

    // El email puede venir del usuario autenticado o del formulario (invitado)
    const finalEmail = userEmail || customer_email || '';
    
    if (!finalEmail) {
      return new Response(
        JSON.stringify({ error: 'Se requiere un email para procesar el pedido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // 3) Crear pedido - SIEMPRE guardar customer_email para búsquedas
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId, // Puede ser null si es invitado
        guest_email: finalEmail, // SIEMPRE guardar el email para búsqueda de seguimiento
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
        payment_intent_id: payment_intent_id || null,
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

    // 4) Crear order_items - usar solo columnas que existen en la tabla
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.unit_price, // La columna se llama 'price' en la tabla original
      size: item.size || null,
      color: item.color || null,
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
    if (discount_code_id && discount_amount > 0 && userId) {
      // Registrar canje (solo para usuarios registrados)
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

    // 7) Generar factura (solo si hay usuario o email de invitado)
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .ilike('invoice_number', `FM-${year}-%`);
    
    const invoiceNumber = `FM-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

    const invoiceStatus = payment_method === 'card' ? 'paid' : 'pending';
    
    // Preparar datos de factura
    const invoiceData: Record<string, any> = {
      order_id: order.id,
      invoice_number: invoiceNumber,
      customer_name: shipping_address.full_name,
      customer_email: finalEmail,
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
    };
    
    // Añadir user_id solo si hay usuario logueado
    if (userId) {
      invoiceData.user_id = userId;
    }
    // Añadir guest_email si es invitado
    if (!userId && finalEmail) {
      invoiceData.guest_email = finalEmail;
    }
    
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
    
    // Log del resultado de la factura
    if (invoiceError) {
      console.error('⚠️ Error creando factura:', invoiceError.message);
      console.error('⚠️ Detalles del error:', JSON.stringify(invoiceError));
      console.error('⚠️ Datos de factura intentados:', JSON.stringify(invoiceData, null, 2));
      // No fallar el pedido si la factura falla
    } else {
      console.log('✅ Factura creada:', invoice?.invoice_number);
    }

    // 8) Generar PDF de factura y enviar email
    const customerEmail = finalEmail;
    const deliveryDays = shipping_method === 'express' 
      ? storeSettings.shipping.express_delivery_days 
      : storeSettings.shipping.estimated_delivery_days;

    // URL para seguimiento
    const trackingUrl = `${siteUrl}/seguimiento?order=${order.order_number || orderNumber}&email=${encodeURIComponent(finalEmail)}`;

    // Generar PDF de factura
    let pdfBuffer: Buffer | null = null;
    try {
      const { generateInvoicePDFDirect } = await import('../../../lib/pdf/invoiceGenerator');
      pdfBuffer = generateInvoicePDFDirect({
        invoiceNumber: invoice?.invoice_number || invoiceNumber,
        orderNumber: order.order_number || orderNumber,
        customerName: shipping_address.full_name,
        customerEmail: finalEmail,
        customerAddress: {
          address_line1: shipping_address.address_line1,
          address_line2: shipping_address.address_line2,
          city: shipping_address.city,
          postal_code: shipping_address.postal_code,
          province: shipping_address.province,
          country: shipping_address.country || 'España',
        },
        items: items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          size: item.size,
          color: item.color,
        })),
        subtotal,
        shippingCost: shipping_cost,
        codExtraCost: cod_extra_cost,
        discount: discount_amount,
        taxRate: storeSettings.taxes.tax_rate,
        total,
        paymentMethod: payment_method,
        status: invoiceStatus,
      });
      console.log('✅ PDF generado correctamente');
    } catch (pdfError: any) {
      console.error('⚠️ Error generando PDF:', pdfError.message);
    }

    // Formatear precio
    const formatPrice = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

    // Fecha de entrega estimada
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    const estimatedDelivery = deliveryDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    // Generar HTML del email - SIMPLE con PDF adjunto
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}${item.size ? ` (Talla: ${item.size})` : ''}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unit_price * item.quantity)}</td>
      </tr>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background: #1e3a5f; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Fashion<span style="color: #c9a227;">Market</span></h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">¡Gracias por tu compra!</p>
      </div>
      
      <!-- Contenido -->
      <div style="padding: 30px;">
        <h2 style="color: #1e3a5f; margin: 0 0 20px;">Pedido Confirmado ✓</h2>
        
        <p style="color: #555; line-height: 1.6;">
          Hola <strong>${shipping_address.full_name}</strong>,<br><br>
          Tu pedido <strong>#${order.order_number || orderNumber}</strong> ha sido confirmado.
          ${pdfBuffer ? '<strong>Adjuntamos tu factura en PDF.</strong>' : ''}
        </p>
        
        <!-- Resumen del pedido -->
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px; color: #1e3a5f;">Resumen del pedido</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #1e3a5f; color: white;">
                <th style="padding: 10px; text-align: left;">Producto</th>
                <th style="padding: 10px; text-align: center;">Cant.</th>
                <th style="padding: 10px; text-align: right;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #1e3a5f;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #666;">Subtotal:</td>
                <td style="padding: 5px 0; text-align: right;">${formatPrice(subtotal)}</td>
              </tr>
              ${discount_amount > 0 ? `
              <tr>
                <td style="padding: 5px 0; color: #22c55e;">Descuento:</td>
                <td style="padding: 5px 0; text-align: right; color: #22c55e;">-${formatPrice(discount_amount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0; color: #666;">Envío:</td>
                <td style="padding: 5px 0; text-align: right;">${shipping_cost === 0 ? 'Gratis' : formatPrice(shipping_cost)}</td>
              </tr>
              ${cod_extra_cost > 0 ? `
              <tr>
                <td style="padding: 5px 0; color: #666;">Contrareembolso:</td>
                <td style="padding: 5px 0; text-align: right;">${formatPrice(cod_extra_cost)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; font-size: 18px; font-weight: bold; color: #1e3a5f;">Total:</td>
                <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold; color: #1e3a5f;">${formatPrice(total)}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Dirección de envío -->
        <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; color: #1e3a5f;">📦 Dirección de envío</h3>
          <p style="margin: 0; color: #555; line-height: 1.6;">
            ${shipping_address.full_name}<br>
            ${shipping_address.address_line1}<br>
            ${shipping_address.postal_code} ${shipping_address.city}, ${shipping_address.province}<br>
            España
          </p>
          <p style="margin: 15px 0 0; color: #059669; font-weight: 500;">
            🚚 Entrega estimada: ${estimatedDelivery}
          </p>
        </div>
        
        <!-- Botón de seguimiento -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackingUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Ver estado del pedido
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; text-align: center;">
          Si tienes alguna pregunta, responde a este email.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
        <p style="margin: 0; color: #888; font-size: 12px;">
          © ${new Date().getFullYear()} FashionMarket · Moda masculina con estilo
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar email con PDF adjunto
    try {
      await sendEmail({
        to: customerEmail,
        subject: `✅ Pedido #${order.order_number || orderNumber} confirmado - FashionMarket`,
        html: emailHtml,
        attachments: pdfBuffer ? [{
          filename: `Factura-${invoice?.invoice_number || invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }] : undefined,
      });
      console.log('✅ Email de confirmación enviado' + (pdfBuffer ? ' con PDF adjunto' : ''));
    } catch (emailError: any) {
      console.error('⚠️ Error enviando email:', emailError.message);
    }

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
        order: {
          id: order.id,
          order_number: order.order_number || orderNumber,
          status: orderStatus,
          total: order.total,
        },
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
