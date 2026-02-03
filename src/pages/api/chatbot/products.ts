/**
 * API para obtener productos para el chatbot
 */
import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60'
  };

  if (!isSupabaseConfigured() || !supabase) {
    return new Response(JSON.stringify({ products: [] }), { headers });
  }

  try {
    const filter = url.searchParams.get('filter') || 'popular';
    const search = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const limit = parseInt(url.searchParams.get('limit') || '6');

    let query = supabase
      .from('products')
      .select('id, name, slug, price, images, featured, created_at, categories(name, slug)')
      .gt('stock', 0);

    // Filtros
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();
      
      if (cat) {
        query = query.eq('category_id', cat.id);
      }
    }

    // Ordenación según filtro
    switch (filter) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'featured':
        query = query.eq('featured', true).order('created_at', { ascending: false });
        break;
      case 'price-low':
        query = query.order('price', { ascending: true });
        break;
      case 'price-high':
        query = query.order('price', { ascending: false });
        break;
      default: // popular/featured first
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
    }

    query = query.limit(limit);

    const { data: products, error } = await query;

    if (error) throw error;

    // Formatear productos para el chatbot
    const formatted = (products || []).map((p: any) => {
      // Obtener primera imagen
      let img = '';
      if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        img = p.images[0];
      } else if (typeof p.images === 'string') {
        try {
          const parsed = JSON.parse(p.images);
          img = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
        } catch {
          img = p.images;
        }
      }

      // Badge
      let badge = null;
      const createdDate = new Date(p.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      if (createdDate > weekAgo) {
        badge = 'NUEVO';
      } else if (p.featured) {
        badge = 'TOP';
      }

      return {
        id: p.id,
        name: p.name,
        price: (p.price / 100).toFixed(2),
        img: img,
        url: `/producto/${p.slug}`,
        badge: badge,
        category: p.categories?.slug || ''
      };
    });

    return new Response(JSON.stringify({ products: formatted }), { headers });

  } catch (error) {
    console.error('Error chatbot products:', error);
    return new Response(JSON.stringify({ products: [] }), { headers });
  }
};
