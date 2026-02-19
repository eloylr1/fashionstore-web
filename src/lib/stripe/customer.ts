/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Stripe Customer Helper
 * Gestiona la creación y recuperación de Stripe Customers vinculados a users
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover' as any,
});

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * Obtiene o crea un Stripe Customer para un usuario.
 * Si el usuario ya tiene un stripe_customer_id en profiles, lo devuelve.
 * Si no, crea uno nuevo en Stripe y lo guarda en profiles.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email?: string,
  name?: string
): Promise<string> {
  // 1. Check if user already has a stripe_customer_id
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, full_name, email')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // 2. Create a new Stripe Customer
  const customerName = name || profile?.full_name || undefined;
  const customerEmail = email || profile?.email || undefined;

  const customer = await stripe.customers.create({
    metadata: { supabase_user_id: userId },
    ...(customerEmail && { email: customerEmail }),
    ...(customerName && { name: customerName }),
  });

  // 3. Save the stripe_customer_id to profiles
  // Use a try-catch in case the column doesn't exist yet
  try {
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customer.id } as any)
      .eq('id', userId);
  } catch (err) {
    console.warn('Could not save stripe_customer_id to profiles:', err);
  }

  return customer.id;
}

/**
 * Vincula (attach) un PaymentMethod a un Stripe Customer.
 * Esto permite reusar el PaymentMethod en futuros pagos.
 */
export async function attachPaymentMethodToCustomer(
  paymentMethodId: string,
  customerId: string
): Promise<void> {
  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  } catch (err: any) {
    // Si ya está vinculado, ignorar el error
    if (err.code === 'resource_already_exists') {
      return;
    }
    throw err;
  }
}

export { stripe };
