/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Addresses Management
 * Endpoints para gestionar direcciones de envío
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Helper para obtener usuario desde cookies
async function getUserFromCookies(cookies: any) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  
  if (!accessToken || !refreshToken) return null;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !data.user) return null;
  return data.user;
}

// GET - Obtener direcciones del usuario
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await getUserFromCookies(cookies);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ addresses }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Añadir o actualizar dirección
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getUserFromCookies(cookies);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { action, address_id, ...addressData } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Preparar datos de la dirección
    const data = {
      user_id: user.id,
      label: addressData.label || 'Casa',
      full_name: addressData.full_name || '',
      phone: addressData.phone || '',
      address_line1: addressData.address_line1 || '',
      address_line2: addressData.address_line2 || '',
      city: addressData.city || '',
      province: addressData.province || '',
      postal_code: addressData.postal_code || '',
      country: 'España',
      is_default: addressData.is_default || false,
    };

    let result;

    if (action === 'add') {
      // Añadir nueva dirección
      const { data: newAddress, error } = await supabase
        .from('addresses')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      result = newAddress;
    } else if (action === 'edit' && address_id) {
      // Actualizar dirección existente
      const { data: updatedAddress, error } = await supabase
        .from('addresses')
        .update(data)
        .eq('id', address_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      result = updatedAddress;
    } else {
      return new Response(JSON.stringify({ error: 'Acción no válida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si es default, quitar default de las demás
    if (data.is_default && result) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', result.id);
    }

    return new Response(JSON.stringify({ success: true, address: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error saving address:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Eliminar dirección
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getUserFromCookies(cookies);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { address_id } = body;

    if (!address_id) {
      return new Response(JSON.stringify({ error: 'ID de dirección requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', address_id)
      .eq('user_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting address:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
