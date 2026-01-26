/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Upload Image
 * Endpoint para subir imágenes a Cloudinary
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { uploadImage, uploadMultipleImages, isCloudinaryConfigured } from '../../../lib/cloudinary/config';

console.log('>>> Cloudinary upload endpoint loaded');

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
  console.log('OPTIONS preflight request from:', origin);
  
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  
  console.log('=== CLOUDINARY UPLOAD START ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Origin:', origin);
  
  // Verificar configuración de Cloudinary primero
  const cloudinaryOk = isCloudinaryConfigured();
  console.log('Cloudinary configured:', cloudinaryOk);
  
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
    // Verificar autenticación de admin
    const accessToken = cookies.get('sb-access-token')?.value;
    const userRole = cookies.get('user-role')?.value?.toLowerCase();
    
    console.log('Auth check:', { hasToken: !!accessToken, role: userRole });

    if (!accessToken || userRole !== 'admin') {
      console.log('Auth failed - No autorizado');
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers
      });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const folder = formData.get('folder')?.toString() || 'products';
    
    console.log('Files received:', files.length, 'Folder:', folder);

    if (!files || files.length === 0) {
      console.log('No files received');
      return new Response(JSON.stringify({ error: 'No se enviaron imágenes' }), {
        status: 400,
        headers
      });
    }

    // Convertir archivos a base64
    const base64Files: string[] = [];
    
    for (const file of files) {
      console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = file.type;
      base64Files.push(`data:${mimeType};base64,${base64}`);
    }

    console.log('Uploading to Cloudinary...');
    
    // Subir a Cloudinary
    let urls: string[];
    
    if (base64Files.length === 1) {
      const url = await uploadImage(base64Files[0], folder);
      urls = [url];
    } else {
      urls = await uploadMultipleImages(base64Files, folder);
    }
    
    console.log('Upload successful:', urls);

    return new Response(JSON.stringify({ 
      success: true, 
      urls,
      message: `${urls.length} imagen(es) subida(s) correctamente`
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('=== CLOUDINARY UPLOAD ERROR ===');
    console.error('Error details:', error);
    return new Response(JSON.stringify({ 
      error: 'Error al subir las imágenes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers
    });
  }
};
