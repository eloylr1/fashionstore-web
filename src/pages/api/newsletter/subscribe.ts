/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Newsletter Subscribe
 * Endpoint para suscribirse al newsletter y obtener código promo
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendNewsletterWelcomeEmail } from '../../../lib/email';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Códigos promo disponibles para nuevos suscriptores
const PROMO_CODES = ['WELCOME10', 'NEWSLETTER15'];

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parsear body
    const body = await request.json();
    const { email, source = 'popup' } = body;

    // Validar email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El email es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Email no válido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Crear cliente Supabase con service role para operaciones admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar si ya está suscrito
    const { data: existing } = await supabase
      .from('newsletter_subscriptions')
      .select('id, email, promo_code, is_active')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      // Si ya existe pero está inactivo, reactivar
      if (!existing.is_active) {
        const promoCode = existing.promo_code || PROMO_CODES[0];
        
        await supabase
          .from('newsletter_subscriptions')
          .update({
            is_active: true,
            promo_code: promoCode,
            subscribed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        // Enviar email de bienvenida al reactivar
        try {
          await sendNewsletterWelcomeEmail({
            email: normalizedEmail,
            promoCode: promoCode,
            discountPercentage: '10%',
          });
          console.log('📧 Email de reactivación enviado a:', normalizedEmail);
        } catch (emailError) {
          console.error('Error enviando email de reactivación:', emailError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            promo_code: promoCode,
            message: '¡Te hemos reactivado! Aquí tienes tu código.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Ya está suscrito y activo
      return new Response(
        JSON.stringify({
          success: true,
          promo_code: existing.promo_code || PROMO_CODES[0],
          message: 'Ya estás suscrito. Aquí tienes tu código.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Asignar código promo (el primero disponible)
    const promoCode = PROMO_CODES[0];

    // Insertar nueva suscripción
    const { error: insertError } = await supabase
      .from('newsletter_subscriptions')
      .insert({
        email: normalizedEmail,
        promo_code: promoCode,
        source: source,
        is_active: true,
        promo_delivered: false,
      });

    if (insertError) {
      console.error('Error inserting subscription:', insertError);
      
      // Manejar error de duplicado (race condition)
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({
            success: true,
            promo_code: promoCode,
            message: 'Ya estás suscrito.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Error al procesar la suscripción' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enviar email de bienvenida con el código de descuento
    try {
      const emailResult = await sendNewsletterWelcomeEmail({
        email: normalizedEmail,
        promoCode: promoCode,
        discountPercentage: '10%',
      });
      
      if (emailResult.success) {
        console.log('📧 Email de bienvenida enviado a:', normalizedEmail);
      } else {
        console.warn('⚠️ No se pudo enviar email de bienvenida:', emailResult.error);
      }
    } catch (emailError) {
      // No fallar la suscripción si el email falla
      console.error('Error enviando email de bienvenida:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        promo_code: promoCode,
        message: '¡Suscripción exitosa!',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in newsletter subscribe:', error);
    return new Response(
      JSON.stringify({ error: 'Error inesperado. Inténtalo de nuevo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
