/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Ensure Profile Endpoint
 * Asegura que un usuario OAuth tenga un perfil creado
 * También asocia pedidos de invitados al usuario
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Función para asociar pedidos de invitados al usuario
async function associateGuestOrders(supabase: any, userId: string, email: string) {
  try {
    // Buscar pedidos donde guest_email coincida y user_id sea NULL
    const { data: guestOrders, error: searchError } = await supabase
      .from('orders')
      .select('id')
      .eq('guest_email', email)
      .is('user_id', null);

    if (searchError) {
      console.error('Error buscando pedidos de invitado:', searchError);
      return { ordersAssociated: 0, error: searchError.message };
    }

    if (!guestOrders || guestOrders.length === 0) {
      return { ordersAssociated: 0 };
    }

    const orderIds = guestOrders.map((o: any) => o.id);
    console.log(`Encontrados ${orderIds.length} pedidos de invitado para asociar a ${email}`);

    // Actualizar los pedidos para asociarlos al usuario
    const { error: updateError } = await supabase
      .from('orders')
      .update({ user_id: userId })
      .in('id', orderIds);

    if (updateError) {
      console.error('Error asociando pedidos:', updateError);
      return { ordersAssociated: 0, error: updateError.message };
    }

    // También actualizar las facturas asociadas
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ user_id: userId })
      .in('order_id', orderIds);

    if (invoiceError) {
      console.error('Error asociando facturas:', invoiceError);
    }

    // También actualizar notas de crédito si existen
    await supabase
      .from('credit_notes')
      .update({ user_id: userId })
      .in('order_id', orderIds);

    console.log(`Asociados ${orderIds.length} pedidos al usuario ${userId}`);
    return { ordersAssociated: orderIds.length };
  } catch (error: any) {
    console.error('Error en associateGuestOrders:', error);
    return { ordersAssociated: 0, error: error.message };
  }
}

export const POST: APIRoute = async ({ request }) => {
  const { user_id, email, full_name, avatar_url, provider } = await request.json();
  
  if (!user_id || !email) {
    return new Response(JSON.stringify({ error: 'User ID y email requeridos' }), {
      status: 400,
    });
  }
  
  // Usar service role para operaciones de servidor
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Verificar si el perfil ya existe
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user_id)
      .single();
    
    if (existingProfile) {
      // Perfil ya existe - asociar pedidos de invitado que pueda tener
      const { ordersAssociated } = await associateGuestOrders(supabase, user_id, email);
      
      return new Response(JSON.stringify({ 
        success: true, 
        role: existingProfile.role,
        isNew: false,
        ordersAssociated 
      }), {
        status: 200,
      });
    }
    
    // Crear nuevo perfil para usuario OAuth
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user_id,
        email,
        full_name: full_name || email.split('@')[0],
        avatar_url: avatar_url || null,
        role: 'customer', // OAuth users siempre son customers
        provider: provider || 'oauth',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating profile:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Error al crear perfil',
        details: insertError.message 
      }), {
        status: 500,
      });
    }

    // Asociar pedidos de invitado al nuevo usuario
    const { ordersAssociated } = await associateGuestOrders(supabase, user_id, email);
    
    return new Response(JSON.stringify({ 
      success: true, 
      role: 'customer',
      isNew: true,
      ordersAssociated
    }), {
      status: 200,
    });
    
  } catch (error: any) {
    console.error('Error in ensure-profile:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error.message 
    }), {
      status: 500,
    });
  }
};
