/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Dynamic Sitemap Endpoint (SSR)
 * Genera un sitemap.xml dinámico con productos y categorías de la BD
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../lib/supabase/server';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://eloyfashionstore.victoriafp.online';

export const GET: APIRoute = async () => {
  try {
    let products: { slug: string; updated_at: string | null }[] = [];
    let categories: { slug: string; updated_at: string | null }[] = [];

    if (supabaseAdmin) {
      // Obtener productos activos
      const { data: prodData } = await supabaseAdmin
        .from('products')
        .select('slug, updated_at')
        .order('updated_at', { ascending: false });

      // Obtener categorías
      const { data: catData } = await supabaseAdmin
        .from('categories')
        .select('slug, updated_at')
        .order('name', { ascending: true });

      products = prodData ?? [];
      categories = catData ?? [];
    }

    const now = new Date().toISOString();

    // Páginas estáticas
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/tienda', priority: '0.9', changefreq: 'daily' },
      { url: '/login', priority: '0.3', changefreq: 'monthly' },
      { url: '/registro', priority: '0.3', changefreq: 'monthly' },
      { url: '/carrito', priority: '0.4', changefreq: 'daily' },
      { url: '/seguimiento', priority: '0.3', changefreq: 'monthly' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Páginas estáticas
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Categorías
    if (categories) {
      for (const cat of categories) {
        xml += `
  <url>
    <loc>${SITE_URL}/categoria/${cat.slug}</loc>
    <lastmod>${cat.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    // Productos
    if (products) {
      for (const product of products) {
        xml += `
  <url>
    <loc>${SITE_URL}/producto/${product.slug}</loc>
    <lastmod>${product.updated_at || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache 1 hora
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Sitemap mínimo de fallback
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/tienda</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
};
