/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Cloudinary Configuration
 * Configuración para subida y gestión de imágenes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary con las credenciales
cloudinary.config({
  cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET,
  secure: true
});

export { cloudinary };

/**
 * Sube una imagen a Cloudinary
 * @param file - Archivo en formato base64 o URL
 * @param folder - Carpeta donde guardar (ej: 'products', 'categories')
 * @returns URL de la imagen subida
 */
export async function uploadImage(file: string, folder: string = 'products'): Promise<string> {
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
