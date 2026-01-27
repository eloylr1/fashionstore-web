/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Completar Pedido
 * Crear pedido y factura después de un pago exitoso con Stripe
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendOrderConfirmationEmail } from '../../../lib/email';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
const siteUrl = import.meta.env.SITE_URL || 'http://localhost:4322';

/**
 * Genera un número de pedido corto y legible
 * Formato: FM-XXXXXX (6 caracteres alfanuméricos)
 */
function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin 0, O, I, 1 para evitar confusión
  let result = 'FM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar configuración
    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' });

    // Parsear body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      paymentIntentId,
      items, // Array de { productId, name, quantity, price, size?, color? }
      shippingAddress,
      discountCode,
      discountCodeId, // ID del código de descuento
      discountAmount = 0,
      customerEmail,
      customerName,
      customerNif,
    } = body;

    // Verificar que el pago fue exitoso en Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ error: 'El pago no ha sido completado' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener usuario de la cookie (opcional para invitados)
    const accessToken = cookies.get('sb-access-token')?.value;
    let user: any = null;
    
    if (accessToken) {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(accessToken);
      if (!userError && authUser) {
        user = authUser;
      }
    }

    // Para invitados, necesitamos el email de la dirección de envío
    const guestEmail = shippingAddress?.email;
    const guestName = shippingAddress?.name;
    
    if (!user && !guestEmail) {
      return new Response(
        JSON.stringify({ error: 'Se requiere un email para completar el pedido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener configuración de la tienda
    const { data: settingsData } = await supabase
      .from('store_settings')
      .select('category, settings')
      .in('category', ['shipping', 'taxes']);

    const storeSettings: Record<string, any> = {
      shipping: { 
        free_shipping_threshold: 10000, 
        standard_shipping_cost: 499,
        estimated_delivery_days: 3,
      },
      taxes: { tax_rate: 21 },
    };

    if (settingsData) {
      for (const item of settingsData) {
        if (item.category && item.settings) {
          storeSettings[item.category] = { ...storeSettings[item.category], ...item.settings };
        }
      }
    }

    // Calcular totales
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    // Envío gratis si supera el umbral configurado
    const shippingCost = subtotal >= storeSettings.shipping.free_shipping_threshold 
      ? 0 
      : storeSettings.shipping.standard_shipping_cost;
    const taxRate = storeSettings.taxes.tax_rate || 21;
    const taxAmount = Math.round((subtotal - discountAmount) * taxRate / 100);
    const total = subtotal - discountAmount + shippingCost;

    // Generar número de pedido corto (y verificar que sea único)
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single();
      
      if (!existing) break;
      orderNumber = generateOrderNumber();
      attempts++;
    }

    // Crear pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null, // null para invitados
        order_number: orderNumber,
        status: 'paid',
        subtotal,
        shipping_cost: shippingCost,
        tax: taxAmount,
        total,
        shipping_address: shippingAddress,
        stripe_payment_intent_id: paymentIntentId,
        discount_code: discountCode,
        discount_amount: discountAmount,
        guest_email: !user ? guestEmail : null, // Guardar email para invitados
        guest_name: !user ? guestName : null, // Guardar nombre para invitados
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Error al crear el pedido' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear items del pedido
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      color: item.color,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
    }

    // Registrar uso del código de descuento
    if (discountCodeId && discountAmount > 0) {
      try {
        // Insertar redención del código
        await supabase
          .from('discount_code_redemptions')
          .insert({
            code_id: discountCodeId,
            user_id: user?.id || null, // null para invitados
            order_id: order.id,
            discount_amount: discountAmount,
          });

        // Incrementar contador de usos
        await supabase.rpc('increment_discount_uses', { code_id: discountCodeId });
      } catch (redemptionError) {
        console.error('Error registering discount code redemption:', redemptionError);
        // No fallamos el pedido por esto, solo lo registramos
      }
    }

    // Generar número de factura
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .ilike('invoice_number', `FM-${year}-%`);
    
    const invoiceNumber = `FM-${year}-${String((count || 0) + 1).padStart(6, '0')}`;

    // Crear factura
    const finalEmail = customerEmail || user?.email || guestEmail || '';
    const finalName = customerName || shippingAddress?.name || user?.email?.split('@')[0] || guestName || 'Cliente';
    
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        order_id: order.id,
        user_id: user?.id || null, // null para invitados
        invoice_number: invoiceNumber,
        customer_name: finalName,
        customer_email: finalEmail,
        customer_nif: customerNif,
        customer_address: shippingAddress,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        status: 'paid',
        payment_method: 'card',
        stripe_payment_intent_id: paymentIntentId,
        paid_date: new Date().toISOString(),
        items: items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total: item.price * item.quantity,
          size: item.size,
          color: item.color,
        })),
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
    }

    // Enviar email de confirmación con la factura
    const emailResult = await sendOrderConfirmationEmail({
      orderNumber: order.order_number,
      customerName: finalName,
      customerEmail: finalEmail,
      items: items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
      })),
      subtotal,
      shippingCost,
      discount: discountAmount,
      tax: taxAmount,
      total,
      shippingAddress: shippingAddress || {},
      invoiceNumber: invoice?.invoice_number || '',
      invoiceUrl: `${siteUrl}/api/invoices/${invoice?.id || order.id}`,
    });

    if (!emailResult.success) {
      console.warn('Email de confirmación no enviado:', emailResult.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          total: order.total,
        },
        invoice: invoice ? {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
        } : null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error completing order:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al completar el pedido' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
