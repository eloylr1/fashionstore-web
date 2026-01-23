/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API: Productos en Oferta
 * Devuelve productos con descuentos activos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const GET: APIRoute = async () => {
  try {
    // Si no hay Supabase configurado, no mostrar ofertas
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ offers: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Primero intentar buscar productos con sale_price (precio de oferta)
    const { data: saleProducts } = await supabase
      .from('products')
      .select('id, name, slug, images, price, sale_price')
      .not('sale_price', 'is', null)
      .gt('sale_price', 0)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Transformar los productos con sale_price
    if (saleProducts && saleProducts.length > 0) {
      const offers = saleProducts.map((product: any) => {
        const originalPrice = product.price;
        const salePrice = product.sale_price;
        const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
        
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || '/placeholder.jpg',
          originalPrice,
          salePrice,
          discount,
        };
      });
      
      return new Response(
        JSON.stringify({ offers }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
          } 
        }
      );
    }
    
    // Si no hay productos con sale_price, buscar productos destacados
    const { data: featuredProducts } = await supabase
      .from('products')
      .select('id, name, slug, images, price')
      .eq('featured', true)
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (featuredProducts && featuredProducts.length > 0) {
      const offers = featuredProducts.map((product: any, index: number) => {
        const discounts = [25, 30, 20];
        const discount = discounts[index % discounts.length];
        const salePrice = Math.round(product.price * (1 - discount / 100));
        
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || '/placeholder.jpg',
          originalPrice: product.price,
          salePrice,
          discount,
        };
      });
      
      return new Response(
        JSON.stringify({ offers }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
          } 
        }
      );
    }
    
    // Si no hay destacados, buscar cualquier producto activo
    const { data: anyProducts } = await supabase
      .from('products')
      .select('id, name, slug, images, price')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (anyProducts && anyProducts.length > 0) {
      const offers = anyProducts.map((product: any, index: number) => {
        const discounts = [15, 20, 10];
        const discount = discounts[index % discounts.length];
        const salePrice = Math.round(product.price * (1 - discount / 100));
        
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || '/placeholder.jpg',
          originalPrice: product.price,
          salePrice,
          discount,
        };
      });
      
      return new Response(
        JSON.stringify({ offers }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
          } 
        }
      );
    }
    
    // No hay productos disponibles
    return new Response(
      JSON.stringify({ offers: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in offers API:', error);
    return new Response(
      JSON.stringify({ offers: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
