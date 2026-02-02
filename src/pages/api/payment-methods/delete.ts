/**
 * API para eliminar un método de pago
 * POST /api/payment-methods/delete
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
      .select('id, is_default')
      .eq('id', payment_method_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingMethod) {
      return new Response(JSON.stringify({ error: 'Método de pago no encontrado' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const wasDefault = (existingMethod as any).is_default;

    // Eliminar el método de pago
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', payment_method_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error eliminando tarjeta:', deleteError);
      return new Response(JSON.stringify({ error: 'Error al eliminar la tarjeta' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Si era la predeterminada, establecer otra como predeterminada
    if (wasDefault) {
      const { data: remainingMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (remainingMethods && remainingMethods.length > 0) {
        await (supabase as any)
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', (remainingMethods[0] as any).id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Tarjeta eliminada correctamente'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en delete payment method:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
