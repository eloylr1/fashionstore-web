// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // URL del sitio para SEO y generación de URLs canónicas
  site: process.env.PUBLIC_SITE_URL || 'https://eloyfashionstore.victoriafp.online',
  
  // SSR con Node.js adapter para Coolify
  output: 'server',
  
  // Desactivar verificación de origen para formularios POST nativos
  // Esto permite que los formularios en /cuenta/perfil y otras páginas funcionen
  security: {
    checkOrigin: false
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    react(),
    sitemap({
      // Filtrar rutas que NO deben estar en el sitemap
      filter: (page) => 
        !page.includes('/admin') &&
        !page.includes('/api/') &&
        !page.includes('/auth/') &&
        !page.includes('/checkout') &&
        !page.includes('/limpiar-cookies') &&
        !page.includes('/cuenta/'),
      // Rutas estáticas personalizadas para el sitemap
      customPages: [
        'https://eloyfashionstore.victoriafp.online/',
        'https://eloyfashionstore.victoriafp.online/tienda',
        'https://eloyfashionstore.victoriafp.online/login',
        'https://eloyfashionstore.victoriafp.online/registro',
        'https://eloyfashionstore.victoriafp.online/seguimiento',
        'https://eloyfashionstore.victoriafp.online/carrito',
      ],
    }),
  ],

  // Configuración de seguridad para imágenes externas (Supabase Storage)
  image: {
    domains: ['*.supabase.co', 'images.unsplash.com'],
  },

  adapter: node({
    mode: 'standalone'
  }),

  // Configuración del servidor para producción
  server: {
    host: '0.0.0.0',
    port: 4321
  }
});