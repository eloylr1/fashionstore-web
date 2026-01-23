// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // URL del sitio para SEO y generación de URLs canónicas
  site: process.env.PUBLIC_SITE_URL || 'https://eloyfashionstore.victoriafp.online',
  
  // SSR con Node.js adapter para Coolify
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react()],

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