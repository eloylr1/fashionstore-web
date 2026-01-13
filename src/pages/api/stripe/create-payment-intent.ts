/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Crear Payment Intent de Stripe
 * Endpoint para inicializar un pago con Stripe
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { amount, currency = 'eur', metadata = {} } = await request.json();

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
