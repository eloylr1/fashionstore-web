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
import { generateInvoicePDF } from '../../../lib/pdf/invoiceGenerator';

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

    // PRIORIZAR el email del formulario de checkout sobre el del usuario logueado
    // Esto permite que un admin haga pedidos de prueba con otro email
    const finalEmail = customer_email || userEmail || '';
    
    console.log('📧 Email del formulario (customer_email):', customer_email);
    console.log('📧 Email del usuario logueado (userEmail):', userEmail);
    console.log('📧 Email final usado:', finalEmail);
    
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

    // 1) Verificar stock disponible para todos los items (por talla)
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

    // Obtener stock por talla y color para los productos
    const { data: variantStockData } = await supabase
      .from('product_variant_stock')
      .select('product_id, size, color, stock')
      .in('product_id', productIds);

    // Crear mapa de stock por producto, talla y color
    const variantStockMap = new Map<string, number>();
    (variantStockData || []).forEach((item: { product_id: string; size: string; color: string | null; stock: number }) => {
      // Clave con color
      const keyWithColor = `${item.product_id}_${item.size}_${item.color || ''}`;
      variantStockMap.set(keyWithColor, item.stock);
      // También guardar sin color para fallback
      const keyWithoutColor = `${item.product_id}_${item.size}_`;
      const existingStock = variantStockMap.get(keyWithoutColor) || 0;
      variantStockMap.set(keyWithoutColor, existingStock + item.stock);
    });

    // Verificar stock por talla y color
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Producto no encontrado: ${item.product_name}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Si el item tiene talla, verificar stock específico de la variante
      if (item.size) {
        // Intentar con color primero, luego sin color
        const keyWithColor = `${item.product_id}_${item.size}_${item.color || ''}`;
        let variantStock = variantStockMap.get(keyWithColor);
        
        // Si no hay stock con color, intentar sin color
        if (variantStock === undefined && item.color) {
          const keyWithoutColor = `${item.product_id}_${item.size}_`;
          variantStock = variantStockMap.get(keyWithoutColor);
        }
        
        // Si no hay registro de stock por variante, usar stock global como fallback
        const availableStock = variantStock !== undefined ? variantStock : product.stock;
        
        if (availableStock < item.quantity) {
          const variantDesc = item.color 
            ? `(Talla ${item.size} / ${item.color})` 
            : `(Talla ${item.size})`;
          return new Response(
            JSON.stringify({ 
              error: `Stock insuficiente para ${product.name} ${variantDesc}. Disponible: ${availableStock}` 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Sin talla específica, verificar stock global
        if (product.stock < item.quantity) {
          return new Response(
            JSON.stringify({ 
              error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
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

    const tax = 0; // IVA ya incluido en precio (para cálculo del total del pedido)
    const total = subtotal - discount_amount + shipping_cost + cod_extra_cost + tax;

    // Calcular IVA desglosado para factura (precios incluyen IVA al 21%)
    const invoiceBaseImponible = Math.round(total / 1.21);
    const invoiceTaxAmount = total - invoiceBaseImponible;

    // Determinar estado inicial según método de pago
    let orderStatus = 'pending';
    if (payment_method === 'transfer') {
      orderStatus = 'awaiting_payment'; // Esperando transferencia
    } else if (payment_method === 'cash_on_delivery') {
      orderStatus = 'pending'; // Pendiente de preparar, pago a la entrega
    } else if (payment_method === 'card') {
      orderStatus = 'paid'; // Pagado con tarjeta
    }

    // Generar número de pedido correlativo (PED-YYYY-LNNNNN ej: PED-2026-A00001)
    const year = new Date().getFullYear();
    const { data: maxOrder } = await supabase
      .from('orders')
      .select('order_number')
      .ilike('order_number', `PED-${year}-%`)
      .order('order_number', { ascending: false })
      .limit(1)
      .single();
    
    let nextOrderSeq = 1;
    if (maxOrder?.order_number) {
      const match = maxOrder.order_number.match(/PED-\d{4}-([A-Z])(\d+)/);
      if (match) {
        const letterVal = match[1].charCodeAt(0) - 65; // A=0, B=1...
        nextOrderSeq = letterVal * 99999 + parseInt(match[2], 10) + 1;
      } else {
        // Compatibilidad con formato antiguo sin letra
        const oldMatch = maxOrder.order_number.match(/PED-\d{4}-(\d+)/);
        if (oldMatch) nextOrderSeq = parseInt(oldMatch[1], 10) + 1;
      }
    }
    const orderLetter = String.fromCharCode(65 + Math.floor((nextOrderSeq - 1) / 99999));
    const orderDigits = ((nextOrderSeq - 1) % 99999) + 1;
    const orderNumber = `PED-${year}-${orderLetter}${String(orderDigits).padStart(5, '0')}`;

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

    // 4) Crear order_items - incluir imagen y slug para historial
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image || null,
      product_slug: item.product_slug || null,
      quantity: item.quantity,
      price: item.unit_price, // La columna se llama 'price' en la tabla original
      unit_price: item.unit_price, // También guardar en unit_price si existe
      total_price: (item.unit_price || 0) * (item.quantity || 1),
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

    // 5) Reducir stock de cada producto (por variante: talla + color)
    for (const item of items) {
      if (item.size) {
        // Intentar reducir stock por variante (talla + color)
        const { error: variantStockError } = await supabase.rpc('decrement_variant_stock', {
          p_product_id: item.product_id,
          p_size: item.size,
          p_color: item.color || null,
          p_quantity: item.quantity,
        });

        // Si la función de variante falla, intentar fallback
        if (variantStockError) {
          console.log('⚠️ decrement_variant_stock error:', variantStockError.message);
          
          // Intentar actualizar directamente la tabla de stock por variante
          const keyWithColor = `${item.product_id}_${item.size}_${item.color || ''}`;
          const currentStock = variantStockMap.get(keyWithColor);
          
          if (currentStock !== undefined) {
            const updateQuery = supabase
              .from('product_variant_stock')
              .update({ stock: Math.max(0, currentStock - item.quantity) })
              .eq('product_id', item.product_id)
              .eq('size', item.size);
            
            if (item.color) {
              await updateQuery.eq('color', item.color);
            } else {
              await updateQuery.is('color', null);
            }
          }
          
          // Actualizar stock total del producto
          const product = productMap.get(item.product_id);
          if (product) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, product.stock - item.quantity) })
              .eq('id', item.product_id);
          }
        }
      } else {
        // Sin talla, actualizar stock global directamente
        const product = productMap.get(item.product_id);
        if (product) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, product.stock - item.quantity) })
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

    // 7) Generar factura - SIEMPRE crear factura con reintentos
    const invoiceStatus = payment_method === 'card' ? 'paid' : 'pending';
    
    // Preparar datos de factura base (sin invoice_number que se genera en cada intento)
    const baseInvoiceData: Record<string, any> = {
      order_id: order.id,
      customer_name: shipping_address.full_name,
      customer_email: finalEmail,
      customer_address: shipping_address,
      subtotal: invoiceBaseImponible,
      tax_rate: storeSettings.taxes.tax_rate || 21,
      tax_amount: invoiceTaxAmount,
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
    
    // Solo añadir user_id si existe (no null)
    if (userId) {
      baseInvoiceData.user_id = userId;
    }
    
    // Intentar crear factura con reintentos (por si hay conflicto de invoice_number)
    let invoice: any = null;
    let invoiceNumber = '';
    const MAX_INVOICE_RETRIES = 5;
    
    for (let attempt = 0; attempt < MAX_INVOICE_RETRIES; attempt++) {
      // Obtener el máximo número de factura actual de forma más fiable
      const { data: maxInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .ilike('invoice_number', `FAC-${year}-%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single();
      
      let nextSeq = 1;
      if (maxInvoice?.invoice_number) {
        const match = maxInvoice.invoice_number.match(/(?:FM|FAC)-\d{4}-([A-Z])(\d+)/);
        if (match) {
          const lv = match[1].charCodeAt(0) - 65;
          nextSeq = lv * 99999 + parseInt(match[2], 10) + 1;
        } else {
          const oldMatch = maxInvoice.invoice_number.match(/(?:FM|FAC)-\d{4}-(\d+)/);
          if (oldMatch) nextSeq = parseInt(oldMatch[1], 10) + 1;
        }
      }
      // Añadir offset por intento para evitar colisiones
      nextSeq += attempt;
      const invLetter = String.fromCharCode(65 + Math.floor((nextSeq - 1) / 99999));
      const invDigits = ((nextSeq - 1) % 99999) + 1;
      invoiceNumber = `FAC-${year}-${invLetter}${String(invDigits).padStart(5, '0')}`;
      
      const invoiceData = { ...baseInvoiceData, invoice_number: invoiceNumber };
      
      console.log(`📝 Intento ${attempt + 1}: Creando factura ${invoiceNumber}`);
      
      const { data: insertedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      
      if (!invoiceError && insertedInvoice) {
        invoice = insertedInvoice;
        console.log('✅ Factura creada exitosamente:', invoice.invoice_number, 'ID:', invoice.id);
        break;
      }
      
      console.error(`❌ Intento ${attempt + 1} fallido:`, invoiceError.message, invoiceError.code);
      
      // Si el error NO es de duplicado, no tiene sentido reintentar
      if (invoiceError.code !== '23505') {
        console.error('❌ Error no recuperable, abortando reintentos');
        break;
      }
    }
    
    if (!invoice) {
      console.error('❌ No se pudo crear la factura después de', MAX_INVOICE_RETRIES, 'intentos');
    }

    // 8) Generar PDF de factura
    const customerEmail = finalEmail;
    const deliveryDays = shipping_method === 'express' 
      ? storeSettings.shipping.express_delivery_days 
      : storeSettings.shipping.estimated_delivery_days;

    // URL para seguimiento
    const trackingUrl = `${siteUrl}/seguimiento?order=${order.order_number || orderNumber}&email=${encodeURIComponent(finalEmail)}`;

    // Calcular IVA
    const baseImponible = Math.round(total / 1.21);
    const ivaAmount = total - baseImponible;

    // Generar PDF usando la función importada al inicio
    let pdfBuffer: Buffer | null = null;
    console.log('📄 Intentando generar PDF de factura...');
    try {
      const pdfData = {
        invoice_number: invoice?.invoice_number || invoiceNumber,
        issue_date: new Date().toISOString(),
        customer_name: shipping_address.full_name,
        customer_email: finalEmail,
        customer_address: {
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
          total: item.unit_price * item.quantity,
          size: item.size || undefined,
          color: item.color || undefined,
        })),
        subtotal: subtotal + shipping_cost + cod_extra_cost,
        tax_rate: 21,
        tax_amount: ivaAmount,
        total,
        discount_amount,
        company_name: 'FashionMarket S.L.',
        company_nif: 'B12345678',
        company_address: 'Calle Moda 123, 28001 Madrid, España',
        status: invoiceStatus,
      };
      console.log('📄 Datos para PDF:', JSON.stringify(pdfData, null, 2));
      pdfBuffer = generateInvoicePDF(pdfData);
      console.log('✅ PDF generado, tamaño:', pdfBuffer?.length, 'bytes');
    } catch (pdfError: any) {
      console.error('❌ ERROR generando PDF:', pdfError.message);
      console.error('❌ Stack:', pdfError.stack);
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

    // Generar HTML del email - SIMPLIFICADO
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
      <div style="padding: 30px; text-align: center;">
        <div style="width: 70px; height: 70px; background: #ecfdf5; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 style="color: #1e3a5f; margin: 0 0 15px;">Pedido Confirmado</h2>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
          Hola <strong>${shipping_address.full_name}</strong>,<br><br>
          Hemos recibido tu pedido <strong>#${order.order_number || orderNumber}</strong> correctamente.
        </p>
        
        <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: left;">
          <p style="margin: 0 0 10px; color: #1e3a5f; font-weight: bold;">Detalles del pedido:</p>
          <p style="margin: 0; color: #555;">
            <strong>Total:</strong> ${formatPrice(total)}<br>
            <strong>Entrega estimada:</strong> ${estimatedDelivery}
          </p>
        </div>
        
        ${pdfBuffer ? `
        <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 25px 0;">
          <p style="margin: 0; color: #059669; font-weight: 500;">
            Tu factura está adjunta a este correo en formato PDF
          </p>
        </div>
        ` : ''}
        
        <!-- Botón de seguimiento -->
        <a href="${trackingUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
          Ver estado del pedido
        </a>
        
        <p style="color: #888; font-size: 14px; margin-top: 25px;">
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
    console.log('📧 Enviando email a:', customerEmail);
    console.log('📧 PDF adjunto:', pdfBuffer ? `SÍ (${pdfBuffer.length} bytes)` : 'NO');
    try {
      const emailResult = await sendEmail({
        to: customerEmail,
        subject: `Pedido #${order.order_number || orderNumber} confirmado - FashionMarket`,
        html: emailHtml,
        attachments: pdfBuffer ? [{
          filename: `Factura-${invoice?.invoice_number || invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }] : undefined,
      });
      console.log('✅ Email enviado:', emailResult);
    } catch (emailError: any) {
      console.error('❌ Error enviando email:', emailError.message);
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
