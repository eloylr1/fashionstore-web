/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - ProductGallery Component (Isla React)
 * Galería de imágenes del producto con thumbnails
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  selectedColorIndex?: number; // Índice del color seleccionado para cambiar imagen
}

export default function ProductGallery({ images, productName, selectedColorIndex }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Fallback si no hay imágenes
  const galleryImages = images.length > 0 ? images : ['/placeholder-product.svg'];
  
  // Escuchar evento de cambio de color desde AddToCartButton
  useEffect(() => {
    const handleColorChange = (event: CustomEvent<{ colorIndex: number }>) => {
      const { colorIndex } = event.detail;
      // Solo cambiar si hay una imagen para ese índice
      if (colorIndex >= 0 && colorIndex < galleryImages.length) {
        setSelectedIndex(colorIndex);
      }
    };

    window.addEventListener('colorChanged', handleColorChange as EventListener);
    
    return () => {
      window.removeEventListener('colorChanged', handleColorChange as EventListener);
    };
  }, [galleryImages.length]);

  // También reaccionar a prop selectedColorIndex si se pasa directamente
  useEffect(() => {
    if (selectedColorIndex !== undefined && selectedColorIndex >= 0 && selectedColorIndex < galleryImages.length) {
      setSelectedIndex(selectedColorIndex);
    }
  }, [selectedColorIndex, galleryImages.length]);
  
  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="aspect-[3/4] bg-cream overflow-hidden">
        <img
          src={galleryImages[selectedIndex]}
          alt={`${productName} - Imagen ${selectedIndex + 1}`}
          className="w-full h-full object-cover object-center transition-opacity duration-300"
        />
      </div>
      
      {/* Thumbnails */}
      {galleryImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {galleryImages.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`
                aspect-square bg-cream overflow-hidden border-2 transition-all duration-200
                ${index === selectedIndex 
                  ? 'border-navy-900' 
                  : 'border-transparent hover:border-charcoal-300'
                }
              `}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <img
                src={image}
                alt={`${productName} - Miniatura ${index + 1}`}
                className="w-full h-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
