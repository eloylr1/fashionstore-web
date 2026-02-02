/**
 * API para establecer un método de pago como predeterminado
 * POST /api/payment-methods/set-default
 */

import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase/client';

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

    // Verificar que el método de pago pertenece al usuario
    const { data: existingMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('id', payment_method_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingMethod) {
      return new Response(JSON.stringify({ error: 'Método de pago no encontrado' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Quitar predeterminado de todas las tarjetas del usuario
    await (supabase as any)
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user.id);

    // Establecer la seleccionada como predeterminada
    const { error: updateError } = await (supabase as any)
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', payment_method_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error estableciendo tarjeta predeterminada:', updateError);
      return new Response(JSON.stringify({ error: 'Error al actualizar la tarjeta' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Tarjeta establecida como predeterminada'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en set-default payment method:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
