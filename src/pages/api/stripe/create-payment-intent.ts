/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Crear Payment Intent de Stripe
 * Endpoint para inicializar un pago con Stripe
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

export const POST: APIRoute = async ({ request }) => {
  // Verificar que Stripe esté configurado
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY no configurada');
    return new Response(
      JSON.stringify({ error: 'Stripe no está configurado correctamente' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover',
  });

  try {
    // Leer y parsear el body
    let body;
    try {
      const text = await request.text();
      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Body vacío' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'JSON inválido en el body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { amount, currency = 'eur', metadata = {} } = body;

    // Validar que tenemos un monto válido
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Monto inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Monto en céntimos
      currency,
      automatic_payment_methods: {
        enabled: true, // Habilita métodos de pago automáticos (Apple Pay, Google Pay, etc.)
      },
      metadata, // Información adicional (order_id, user_id, etc.)
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al procesar el pago' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
