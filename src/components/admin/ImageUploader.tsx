/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - ImageUploader Component (Isla React)
 * Componente de drag & drop para subir imágenes a Supabase Storage
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

interface ImageUploaderProps {
  onImagesChange?: (urls: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
  inputName?: string; // Nombre del input hidden para el form
}

export default function ImageUploader({ 
  onImagesChange, 
  existingImages = [], 
  maxImages = 6,
  inputName = 'images'
}: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Actualizar input hidden para forms
  const updateHiddenInput = (urls: string[]) => {
    const input = document.getElementById(inputName) as HTMLInputElement;
    if (input) {
      input.value = JSON.stringify(urls);
    }
    onImagesChange?.(urls);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!isSupabaseConfigured() || !supabase) {
      setError('Supabase no está configurado');
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('products-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter(
      file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
    );

    if (validFiles.length === 0) {
      setError('Solo se permiten imágenes de hasta 5MB');
      return;
    }

    if (images.length + validFiles.length > maxImages) {
      setError(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    setError(null);
    setIsUploading(true);

    const uploadPromises = validFiles.map(file => uploadImage(file));
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((url): url is string => url !== null);

    const newImages = [...images, ...successfulUploads];
    setImages(newImages);
    updateHiddenInput(newImages);
    setIsUploading(false);
  }, [images, maxImages, updateHiddenInput]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    updateHiddenInput(newImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setImages(newImages);
    updateHiddenInput(newImages);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-charcoal-700">
        Imágenes del producto
      </label>
      
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-navy-500 bg-navy-50' 
            : 'border-charcoal-200 hover:border-charcoal-300'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="image-upload"
          disabled={isUploading || images.length >= maxImages}
        />
        
        <label 
          htmlFor="image-upload"
          className="cursor-pointer"
        >
          <svg 
            className="mx-auto h-12 w-12 text-charcoal-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.5" 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          
          <p className="mt-4 text-sm text-charcoal-600">
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subiendo imágenes...
              </span>
            ) : (
              <>
                <span className="font-medium text-navy-700">Arrastra imágenes aquí</span>
                <br />
                o haz clic para seleccionar
              </>
            )}
          </p>
          
          <p className="mt-2 text-xs text-charcoal-400">
            PNG, JPG hasta 5MB. Máximo {maxImages} imágenes.
          </p>
        </label>
      </div>
      
      {/* Error */}
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      
      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div 
              key={url}
              className="relative aspect-square bg-cream overflow-hidden group"
            >
              <img
                src={url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay con acciones */}
              <div className="absolute inset-0 bg-navy-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => reorderImages(index, index - 1)}
                    className="p-2 bg-white rounded-full text-charcoal-700 hover:bg-charcoal-100"
                    title="Mover izquierda"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-2 bg-error rounded-full text-white hover:bg-red-700"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => reorderImages(index, index + 1)}
                    className="p-2 bg-white rounded-full text-charcoal-700 hover:bg-charcoal-100"
                    title="Mover derecha"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Principal badge */}
              {index === 0 && (
                <span className="absolute top-2 left-2 bg-navy-900 text-white text-xs px-2 py-1">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
