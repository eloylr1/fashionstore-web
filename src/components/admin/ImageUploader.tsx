/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - ImageUploader Component (Cloudinary)
 * Componente de drag & drop para subir imágenes a Cloudinary
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onImagesChange?: (urls: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
  inputName?: string;
  folder?: string;
}

export default function ImageUploader({ 
  onImagesChange, 
  existingImages = [], 
  maxImages = 6,
  inputName = 'images',
  folder = 'products'
}: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Actualizar input hidden para forms
  const updateHiddenInput = (urls: string[]) => {
    const input = document.getElementById(inputName) as HTMLInputElement;
    if (input) {
      input.value = JSON.stringify(urls);
    }
    onImagesChange?.(urls);
  };

  // Subir imágenes a Cloudinary via API
  const uploadToCloudinary = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('images', file);
    });
    formData.append('folder', folder);

    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al subir imágenes');
    }

    const data = await response.json();
    return data.urls;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter(
      file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB max
    );

    if (validFiles.length === 0) {
      setError('Solo se permiten imágenes de hasta 10MB');
      return;
    }

    if (images.length + validFiles.length > maxImages) {
      setError(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(`Subiendo ${validFiles.length} imagen(es)...`);

    try {
      const uploadedUrls = await uploadToCloudinary(validFiles);
      
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      updateHiddenInput(newImages);
      setUploadProgress('¡Imágenes subidas correctamente!');
      
      setTimeout(() => setUploadProgress(''), 3000);
    } catch (err) {
      console.error('Error uploading:', err);
      setError(err instanceof Error ? err.message : 'Error al subir las imágenes');
    } finally {
      setIsUploading(false);
    }
  }, [images, maxImages, folder]);

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

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium" style={{ color: '#404040' }}>
        Imágenes del producto
        <span className="text-xs font-normal ml-2" style={{ color: '#8a8a8a' }}>
          (Cloudinary - máx. {maxImages} imágenes, 10MB cada una)
        </span>
      </label>
      
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragging ? '#0a1628' : '#d4d4d4'}`,
          backgroundColor: isDragging ? '#f5f3ef' : 'transparent',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          opacity: isUploading ? 0.5 : 1,
          pointerEvents: isUploading ? 'none' : 'auto'
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
          id="image-upload-cloudinary"
          disabled={isUploading || images.length >= maxImages}
        />
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#b8a067', borderTopColor: 'transparent' }}></div>
            <p style={{ color: '#0a1628' }}>{uploadProgress}</p>
          </div>
        ) : (
          <>
            <svg 
              className="mx-auto mb-4" 
              style={{ width: '48px', height: '48px', color: '#8a8a8a' }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style={{ color: '#404040', marginBottom: '8px' }}>
              Arrastra y suelta imágenes aquí
            </p>
            <p style={{ color: '#8a8a8a', fontSize: '14px', marginBottom: '16px' }}>
              o
            </p>
            <label
              htmlFor="image-upload-cloudinary"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#0a1628',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                cursor: images.length >= maxImages ? 'not-allowed' : 'pointer',
                opacity: images.length >= maxImages ? 0.5 : 1
              }}
            >
              Seleccionar archivos
            </label>
            <p style={{ color: '#8a8a8a', fontSize: '12px', marginTop: '12px' }}>
              PNG, JPG, WEBP hasta 10MB
            </p>
          </>
        )}
      </div>

      {/* Mensaje de éxito */}
      {uploadProgress && !isUploading && (
        <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2d5a3d', fontSize: '14px' }}>
          ✓ {uploadProgress}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#8b2635', fontSize: '14px' }}>
          ⚠ {error}
        </div>
      )}

      {/* Vista previa de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div 
              key={index} 
              className="relative group"
              style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f5f3ef' }}
            >
              <img
                src={url}
                alt={`Imagen ${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Badge de posición */}
              {index === 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#b8a067',
                    color: '#0a1628',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}
                >
                  Principal
                </span>
              )}
              
              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#8b2635',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s ease'
                }}
                className="group-hover:opacity-100"
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contador de imágenes */}
      <p style={{ color: '#8a8a8a', fontSize: '12px', textAlign: 'right' }}>
        {images.length} de {maxImages} imágenes
      </p>

      {/* Input hidden para el formulario */}
      <input
        type="hidden"
        id={inputName}
        name={inputName}
        value={JSON.stringify(images)}
      />
    </div>
  );
}
