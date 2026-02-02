/**
 * Endpoint de diagnóstico para verificar pedidos
 * SOLO PARA DEBUG - eliminar después
 */

import type { APIRoute } from 'astro';
import { supabaseAdmin, isSupabaseAdminConfigured } from '../../../lib/supabase/server';

export const GET: APIRoute = async () => {
  const debug: any = {
    isConfigured: isSupabaseAdminConfigured(),
    supabaseAdminExists: !!supabaseAdmin,
    envCheck: {
      hasUrl: !!import.meta.env.PUBLIC_SUPABASE_URL,
      hasServiceKey: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      // Mostrar primeros/últimos caracteres de la key para verificar
      serviceKeyPreview: import.meta.env.SUPABASE_SERVICE_ROLE_KEY 
        ? `${import.meta.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...${import.meta.env.SUPABASE_SERVICE_ROLE_KEY.slice(-10)}`
        : 'NOT SET'
    },
    orders: null,
    error: null
  };

  if (isSupabaseAdminConfigured() && supabaseAdmin) {
    try {
      // Primero, consulta simple sin joins
      const { data: simpleData, error: simpleError } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, status, created_at')
        .limit(5);
      
      debug.simpleQuery = {
        data: simpleData,
        error: simpleError,
        count: simpleData?.length || 0
      };

      // Luego con el join
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          profiles:user_id!left (
            full_name,
            email
          ),
          order_items (
            id,
            product_name,
            quantity,
            price
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      debug.fullQuery = {
        data: data,
        error: error,
        count: data?.length || 0
      };

    } catch (e: any) {
      debug.error = e.message;
    }
  } else {
    debug.error = 'Supabase Admin not configured';
  }

  return new Response(JSON.stringify(debug, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
