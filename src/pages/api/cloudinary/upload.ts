/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Upload Image
 * Endpoint para subir imágenes a Cloudinary
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { uploadImage, uploadMultipleImages, isCloudinaryConfigured } from '../../../lib/cloudinary/config';
import { verifyAdminSecure } from '../../../lib/supabase/server';

// Headers CORS para todas las respuestas
const getCorsHeaders = (origin: string | null) => {
  // Permitir el origen de la petición o el dominio principal
  const allowedOrigin = origin || 'https://eloyfashionstore.victoriafp.online';
  
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
};

// Handler para preflight OPTIONS
export const OPTIONS: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  
  // Verificar configuración de Cloudinary primero
  const cloudinaryOk = isCloudinaryConfigured();
  
  if (!cloudinaryOk) {
    return new Response(JSON.stringify({ 
      error: 'Cloudinary no está configurado correctamente',
      details: 'Faltan variables de entorno CLOUDINARY_*'
    }), {
      status: 500,
      headers
    });
  }
  
  try {
    // Verificar autenticación de admin (segura - desde BD)
    const auth = await verifyAdminSecure(cookies);
    if (!auth.isAdmin) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers
      });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const folder = formData.get('folder')?.toString() || 'products';

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No se enviaron imágenes' }), {
        status: 400,
        headers
      });
    }

    // Convertir archivos a base64
    const base64Files: string[] = [];
    
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = file.type;
      base64Files.push(`data:${mimeType};base64,${base64}`);
    }
    
    // Subir a Cloudinary
    let urls: string[];
    
    if (base64Files.length === 1) {
      const url = await uploadImage(base64Files[0], folder);
      urls = [url];
    } else {
      urls = await uploadMultipleImages(base64Files, folder);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      urls,
      message: `${urls.length} imagen(es) subida(s) correctamente`
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Error al subir las imágenes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers
    });
  }
};
