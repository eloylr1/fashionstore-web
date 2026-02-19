/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Dynamic robots.txt Endpoint (SSR)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://eloyfashionstore.victoriafp.online';

export const GET: APIRoute = async () => {
  const robotsTxt = `# FashionMarket - robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /cuenta/
Disallow: /checkout
Disallow: /limpiar-cookies

Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache 24h
    },
  });
};
