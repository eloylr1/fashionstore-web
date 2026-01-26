/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Cloudinary Configuration
 * Configuración para subida y gestión de imágenes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { v2 as cloudinary } from 'cloudinary';

// Obtener variables de entorno (compatible con SSR)
const getEnvVar = (key: string): string => {
  // Intentar import.meta.env primero (Astro/Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = (import.meta.env as any)[key];
    if (value) return value;
  }
  // Fallback a process.env (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
};

const cloudName = getEnvVar('PUBLIC_CLOUDINARY_CLOUD_NAME');
const apiKey = getEnvVar('CLOUDINARY_API_KEY');
const apiSecret = getEnvVar('CLOUDINARY_API_SECRET');

// Log para debug (solo en desarrollo)
console.log('Cloudinary config:', { 
  hasCloudName: !!cloudName, 
  hasApiKey: !!apiKey, 
  hasApiSecret: !!apiSecret 
});

// Configurar Cloudinary con las credenciales
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

export { cloudinary };

/**
 * Verifica si Cloudinary está configurado
 */
export function isCloudinaryConfigured(): boolean {
  return !!(cloudName && apiKey && apiSecret);
}

/**
 * Sube una imagen a Cloudinary
 * @param file - Archivo en formato base64 o URL
 * @param folder - Carpeta donde guardar (ej: 'products', 'categories')
 * @returns URL de la imagen subida
 */
export async function uploadImage(file: string, folder: string = 'products'): Promise<string> {
  // Verificar configuración
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado. Verifica las variables de entorno: PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  }

  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: `fashionmarket/${folder}`,
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Limitar tamaño máximo
        { quality: 'auto:good' }, // Optimizar calidad
        { fetch_format: 'auto' } // Formato óptimo (webp, etc)
      ]
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Error subiendo imagen a Cloudinary:', error);
    throw new Error('Error al subir la imagen');
  }
}

/**
 * Sube múltiples imágenes a Cloudinary
 * @param files - Array de archivos en base64
 * @param folder - Carpeta donde guardar
 * @returns Array de URLs de las imágenes subidas
 */
export async function uploadMultipleImages(files: string[], folder: string = 'products'): Promise<string[]> {
  const uploadPromises = files.map(file => uploadImage(file, folder));
  return Promise.all(uploadPromises);
}

/**
 * Elimina una imagen de Cloudinary
 * @param publicId - ID público de la imagen
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    throw new Error('Error al eliminar la imagen');
  }
}

/**
 * Obtiene el public_id de una URL de Cloudinary
 * @param url - URL completa de Cloudinary
 * @returns public_id para usar en operaciones
 */
export function getPublicIdFromUrl(url: string): string {
  // URL ejemplo: https://res.cloudinary.com/xxx/image/upload/v123/fashionmarket/products/abc.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return '';
  
  // Obtener todo después de 'upload/vXXX/'
  const pathParts = parts.slice(uploadIndex + 2);
  const fullPath = pathParts.join('/');
  
  // Quitar la extensión
  return fullPath.replace(/\.[^/.]+$/, '');
}
