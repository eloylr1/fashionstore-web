/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Pública de Configuración de Tienda
 * Devuelve la configuración de envíos, pagos e impuestos para el checkout
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const GET: APIRoute = async () => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      // Devolver configuración por defecto si no hay Supabase
      return new Response(JSON.stringify({
        shipping: {
          free_shipping_threshold: 10000, // 100€ en céntimos
          standard_shipping_cost: 499,    // 4.99€ en céntimos
          express_shipping_cost: 999,     // 9.99€ en céntimos
          express_shipping_enabled: true,
          estimated_delivery_days: 3,
          express_delivery_days: 1,
          return_days: 30,
        },
        payments: {
          stripe_enabled: true,
          paypal_enabled: false,
          transfer_enabled: true,
          cash_on_delivery_enabled: true,
          cod_extra_cost: 0,
          currency: 'EUR',
          currency_symbol: '€',
        },
        taxes: {
          tax_enabled: true,
          tax_rate: 21,
          tax_name: 'IVA',
          prices_include_tax: true,
        },
      }), { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obtener todas las configuraciones
    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('category, settings')
      .in('category', ['shipping', 'payments', 'taxes']);

    if (error) {
      console.error('Error fetching store settings:', error);
      throw error;
    }

    // Organizar por categoría
    const config: Record<string, any> = {
      shipping: {
        free_shipping_threshold: 10000,
        standard_shipping_cost: 499,
        express_shipping_cost: 999,
        express_shipping_enabled: true,
        estimated_delivery_days: 3,
        express_delivery_days: 1,
        return_days: 30,
      },
      payments: {
        stripe_enabled: true,
        paypal_enabled: false,
        transfer_enabled: true,
        cash_on_delivery_enabled: true,
        cod_extra_cost: 0,
        currency: 'EUR',
        currency_symbol: '€',
      },
      taxes: {
        tax_enabled: true,
        tax_rate: 21,
        tax_name: 'IVA',
        prices_include_tax: true,
      },
    };

    // Sobrescribir con valores de la base de datos
    if (settings) {
      for (const item of settings) {
        if (item.category && item.settings) {
          config[item.category] = { ...config[item.category], ...item.settings };
        }
      }
    }

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: any) {
    console.error('Error in store settings API:', error);
    
    // Devolver configuración por defecto en caso de error
    return new Response(JSON.stringify({
      shipping: {
        free_shipping_threshold: 10000,
        standard_shipping_cost: 499,
        express_shipping_cost: 999,
        express_shipping_enabled: true,
        estimated_delivery_days: 3,
        express_delivery_days: 1,
        return_days: 30,
      },
      payments: {
        stripe_enabled: true,
        paypal_enabled: false,
        transfer_enabled: true,
        cash_on_delivery_enabled: true,
        cod_extra_cost: 0,
        currency: 'EUR',
        currency_symbol: '€',
      },
      taxes: {
        tax_enabled: true,
        tax_rate: 21,
        tax_name: 'IVA',
        prices_include_tax: true,
      },
    }), { status: 200, headers: corsHeaders });
  }
};
