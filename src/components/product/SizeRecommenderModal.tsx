/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Size Recommender Modal (Isla React)
 * Modal para recomendar talla basado en altura y peso del usuario
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';
import { recommendSize, validateMeasurements, type SizeResult } from '../../lib/sizeRecommender';

interface SizeRecommenderModalProps {
  availableSizes: string[];
  onSelectSize?: (size: string) => void;
}

export default function SizeRecommenderModal({ availableSizes, onSelectSize }: SizeRecommenderModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [result, setResult] = useState<{ size: SizeResult; confidence: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeModal();
    }
  };

  const openModal = () => {
    setIsOpen(true);
    setResult(null);
    setError(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setResult(null);
    setError(null);
    setHeight('');
    setWeight('');
  };

  const handleCalculate = () => {
    setError(null);
    setResult(null);

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    // Validar
    const validation = validateMeasurements(heightNum, weightNum);
    if (!validation.valid) {
      setError(validation.error || 'Datos inválidos');
      return;
    }

    // Calcular recomendación
    const recommendation = recommendSize({ height: heightNum, weight: weightNum });
    setResult(recommendation);
  };

  const handleSelectSize = () => {
    if (result && onSelectSize) {
      // Verificar si la talla está disponible
      if (availableSizes.includes(result.size)) {
        onSelectSize(result.size);
        closeModal();
      }
    }
  };

  const isSizeAvailable = result ? availableSizes.includes(result.size) : false;

  return (
    <>
      {/* Botón para abrir modal */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-sm text-charcoal-600 hover:text-navy-900 transition-colors underline decoration-dotted underline-offset-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        ¿Cuál es mi talla?
      </button>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div 
            ref={modalRef}
            className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-modal-title"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 id="size-modal-title" className="text-lg font-bold text-white">
                  Recomendador de Talla
                </h2>
                <p className="text-sm text-amber-300 font-medium">Encuentra tu talla ideal</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!result ? (
                <>
                  <p className="text-sm text-gray-600 mb-5">
                    Introduce tu altura y peso para calcular la talla que mejor se ajusta a ti.
                  </p>

                  <div className="space-y-4">
                    {/* Altura */}
                    <div>
                      <label htmlFor="height" className="block text-sm font-medium text-gray-800 mb-1.5">
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        id="height"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="Ej: 175"
                        min="100"
                        max="250"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    {/* Peso */}
                    <div>
                      <label htmlFor="weight" className="block text-sm font-medium text-gray-800 mb-1.5">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        id="weight"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Ej: 70"
                        min="30"
                        max="200"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all text-gray-900 placeholder:text-gray-400"
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    {/* Botón Calcular */}
                    <button
                      type="button"
                      onClick={handleCalculate}
                      className="w-full py-3 bg-navy-900 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors"
                    >
                      Calcular mi talla
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-gray-500 text-center">
                    * Esta es una estimación orientativa basada en medidas estándar.
                  </p>
                </>
              ) : (
                /* Resultado */
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-navy-900 to-navy-700 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl font-bold text-white">{result.size}</span>
                  </div>
                  
                  <h3 className="text-xl font-serif font-semibold text-navy-900 mb-2">
                    Te recomendamos la talla {result.size}
                  </h3>
                  
                  <p className="text-sm text-charcoal-600 mb-4">
                    {result.message}
                  </p>

                  {/* Indicador de confianza */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="text-xs text-charcoal-500">Nivel de confianza:</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      result.confidence === 'alta' 
                        ? 'bg-green-100 text-green-700' 
                        : result.confidence === 'media'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-charcoal-100 text-charcoal-600'
                    }`}>
                      {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)}
                    </span>
                  </div>

                  {/* Botones */}
                  <div className="space-y-3">
                    {isSizeAvailable ? (
                      <button
                        type="button"
                        onClick={handleSelectSize}
                        className="w-full py-3 bg-navy-900 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors"
                      >
                        Seleccionar talla {result.size}
                      </button>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        La talla {result.size} no está disponible para este producto.
                        {availableSizes.length > 0 && (
                          <span className="block mt-1">
                            Tallas disponibles: {availableSizes.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="w-full py-3 border border-charcoal-200 text-charcoal-700 font-medium rounded-lg hover:bg-charcoal-50 transition-colors"
                    >
                      Calcular de nuevo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
