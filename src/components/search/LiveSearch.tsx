/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Live Search Component (Isla React)
 * Buscador instantáneo con debounce y dropdown de resultados
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number;
}

interface LiveSearchProps {
  isHomepage?: boolean;
}

// Formatear precio de céntimos a euros
const formatPrice = (cents: number): string => {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
};

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function LiveSearch({ isHomepage = false }: LiveSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Buscar productos
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowNoResults(false);
      return;
    }

    // Cancelar petición anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setShowNoResults(false);

    try {
      const response = await fetch(
        `/api/search/products?q=${encodeURIComponent(searchQuery)}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Error en búsqueda');
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        setResults(data);
        setShowNoResults(data.length === 0 && searchQuery.length >= 2);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Search error:', error);
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (debouncedQuery) {
      searchProducts(debouncedQuery);
    } else {
      setResults([]);
      setShowNoResults(false);
    }
  }, [debouncedQuery, searchProducts]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  // Cleanup abort controller
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (query.trim()) {
      setIsOpen(true);
    }
  };

  const handleResultClick = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    window.location.href = `/producto/${slug}`;
  };

  const showDropdown = isOpen && (results.length > 0 || showNoResults || isLoading);

  return (
    <div ref={containerRef} className="relative">
      {/* Input de búsqueda */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Buscar productos…"
          className={`
            w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border transition-all duration-200
            ${isHomepage 
              ? 'bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20 focus:border-white/40' 
              : 'bg-charcoal-50 border-charcoal-200 text-charcoal-800 placeholder-charcoal-400 focus:bg-white focus:border-navy-300 focus:ring-2 focus:ring-navy-100'
            }
            focus:outline-none
          `}
          aria-label="Buscar productos"
          aria-expanded={showDropdown}
          aria-controls="search-results"
          autoComplete="off"
        />
        
        {/* Icono de búsqueda / Loading */}
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isHomepage ? 'text-white/60' : 'text-charcoal-400'}`}>
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Botón limpiar */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowNoResults(false);
              inputRef.current?.focus();
            }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
              isHomepage 
                ? 'text-white/60 hover:text-white hover:bg-white/10' 
                : 'text-charcoal-400 hover:text-charcoal-600 hover:bg-charcoal-100'
            }`}
            aria-label="Limpiar búsqueda"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <div 
          id="search-results"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-charcoal-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto"
          role="listbox"
        >
          {/* Loading skeleton */}
          {isLoading && results.length === 0 && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-charcoal-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-charcoal-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-charcoal-100 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && (
            <ul>
              {results.map((product, index) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(product.slug)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-charcoal-50 transition-colors ${
                      index !== results.length - 1 ? 'border-b border-charcoal-100' : ''
                    }`}
                    role="option"
                  >
                    {/* Imagen */}
                    <div className="w-12 h-12 bg-cream rounded overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-charcoal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-charcoal-500">
                        {formatPrice(product.price)}
                      </p>
                    </div>

                    {/* Flecha */}
                    <svg className="w-4 h-4 text-charcoal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Sin resultados */}
          {showNoResults && !isLoading && (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-charcoal-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-charcoal-600 font-medium">No encontramos resultados</p>
              <p className="text-sm text-charcoal-400 mt-1">
                Prueba con otros términos de búsqueda
              </p>
            </div>
          )}

          {/* Ver todos los resultados */}
          {results.length > 0 && (
            <a
              href={`/tienda?q=${encodeURIComponent(query)}`}
              className="block p-3 text-center text-sm font-medium text-navy-700 bg-charcoal-50 hover:bg-charcoal-100 transition-colors border-t border-charcoal-100"
            >
              Ver todos los resultados →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
