/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Upload Image
 * Endpoint para subir imágenes a Cloudinary
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { uploadImage, uploadMultipleImages } from '../../../lib/cloudinary/config';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación de admin
    const accessToken = cookies.get('sb-access-token')?.value;
    const userRole = cookies.get('user-role')?.value;

    if (!accessToken || userRole !== 'admin') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const folder = formData.get('folder')?.toString() || 'products';

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No se enviaron imágenes' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en upload:', error);
    return new Response(JSON.stringify({ 
      error: 'Error al subir las imágenes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
