/**
 * API para guardar un método de pago de Stripe
 * POST /api/payment-methods/save
 */

import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase/client';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  // @ts-ignore - versión compatible con nuestra instalación
  apiVersion: '2024-12-18.acacia',
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken || !isSupabaseConfigured() || !supabase) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { payment_method_id } = await request.json();
    
    if (!payment_method_id) {
      return new Response(JSON.stringify({ error: 'ID de método de pago requerido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener detalles del método de pago de Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
    
    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      return new Response(JSON.stringify({ error: 'Solo se pueden guardar tarjetas' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const card = paymentMethod.card;

    // Verificar si ya existe esta tarjeta guardada
    const { data: existingCards } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .eq('card_last4', card.last4)
      .eq('card_brand', card.brand);

    if (existingCards && existingCards.length > 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Esta tarjeta ya está guardada',
        already_exists: true 
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si es la primera tarjeta (será la predeterminada)
    const { data: userCards } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id);

    const isDefault = !userCards || userCards.length === 0;

    // Crear label descriptivo
    const brandName = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Tarjeta';
    const label = `${brandName} terminada en ${card.last4}`;

    // Guardar en la base de datos
    // Intentar con stripe_payment_method_id, si la columna no existe, reintentar sin ella
    const basePayload: Record<string, any> = {
      user_id: user.id,
      type: 'card',
      card_brand: card.brand,
      card_last4: card.last4,
      expiry_month: card.exp_month,
      expiry_year: card.exp_year,
      is_default: isDefault,
    };

    let savedCard: any = null;
    let error: any = null;

    const result1 = await supabase
      .from('payment_methods')
      .insert({ ...basePayload, stripe_payment_method_id: payment_method_id } as any)
      .select()
      .single();

    if (result1.error && result1.error.message?.includes('stripe_payment_method_id')) {
      console.warn('stripe_payment_method_id column not found, inserting without it');
      const result2 = await supabase
        .from('payment_methods')
        .insert(basePayload as any)
        .select()
        .single();
      savedCard = result2.data;
      error = result2.error;
    } else {
      savedCard = result1.data;
      error = result1.error;
    }

    if (error) {
      console.error('Error guardando tarjeta:', error);
      return new Response(JSON.stringify({ error: 'Error al guardar la tarjeta' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Tarjeta guardada correctamente',
      card: {
        id: (savedCard as any)?.id,
        card_last4: (savedCard as any)?.card_last4,
        card_brand: (savedCard as any)?.card_brand,
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en save payment method:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
