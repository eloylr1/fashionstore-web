// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // URL del sitio para SEO y generación de URLs canónicas
  site: 'http://localhost:4321',
  
  // Astro 5.0: output: 'static' es el default
  // Las páginas con `export const prerender = false` serán SSR automáticamente
  output: 'static',

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
  })
});