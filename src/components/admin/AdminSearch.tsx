/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Search Component (React)
 * Búsqueda global profesional para el panel de administración
 * Soporta búsquedas especiales: "stock bajo", "pedidos pendientes", etc.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
  id: string;
  type: 'product' | 'order' | 'customer';
  title: string;
  subtitle: string;
  link: string;
}

// Sugerencias de búsqueda especiales
const QUICK_SEARCHES = [
  { label: 'Stock bajo', query: 'stock bajo', icon: '⚠️' },
  { label: 'Sin stock', query: 'sin stock', icon: '❌' },
  { label: 'Pendientes', query: 'pedidos pendientes', icon: '🟡' },
  { label: 'Destacados', query: 'productos destacados', icon: '⭐' },
  { label: 'Últimos pedidos', query: 'últimos pedidos', icon: '📦' },
  { label: 'Clientes', query: 'clientes', icon: '👥' },
];

export default function AdminSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSpecialSearch, setIsSpecialSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abrir con Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus en el input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Función de búsqueda
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSpecialSearch(false);
      return;
    }

    // Cancelar búsqueda anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/search?q=${encodeURIComponent(searchQuery)}&limit=15`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('Search error:', data.error);
        setResults([]);
        return;
      }

      setResults(data.results || []);
      setIsSpecialSearch(data.isSpecialSearch || false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Búsqueda cancelada, ignorar
        return;
      }
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Manejar clic en búsqueda rápida
  const handleQuickSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setActiveIndex(-1);
  };

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      window.location.href = results[activeIndex].link;
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'product':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'order':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'customer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  const getTypeBadge = (type: SearchResult['type']) => {
    const badges = {
      product: { label: 'Producto', class: 'bg-blue-100 text-blue-700' },
      order: { label: 'Pedido', class: 'bg-green-100 text-green-700' },
      customer: { label: 'Cliente', class: 'bg-purple-100 text-purple-700' },
    };
    return badges[type];
  };

  // Limpiar al cerrar
  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
  };

  return (
    <>
      {/* Search Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        aria-label="Buscar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden lg:inline text-sm text-gray-400">Ctrl+K</span>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
          
          {/* Modal */}
          <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
            <div 
              ref={modalRef}
              className="w-full max-w-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden rounded-lg"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar productos, pedidos, clientes o escribir: stock bajo, pedidos pendientes..."
                  className="flex-1 text-base outline-none placeholder-gray-400"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      inputRef.current?.focus();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-2">
                    {isSpecialSearch && (
                      <div className="px-4 py-2 text-xs text-gray-500 bg-blue-50 border-b border-blue-100">
                        ✨ Búsqueda especial: mostrando resultados filtrados
                      </div>
                    )}
                    {results.map((result, index) => {
                      const badge = getTypeBadge(result.type);
                      return (
                        <a
                          key={`${result.type}-${result.id}`}
                          href={result.link}
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                            index === activeIndex ? 'bg-blue-50' : ''
                          }`}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                            {getIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{result.title}</p>
                              <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${badge.class}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      );
                    })}
                  </div>
                ) : query ? (
                  <div className="p-8 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500">No se encontraron resultados para "{query}"</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Prueba con: stock bajo, pedidos pendientes, sin stock...
                    </p>
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">Búsquedas rápidas:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_SEARCHES.map(item => (
                        <button
                          key={item.query}
                          onClick={() => handleQuickSearch(item.query)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-left"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        También puedes buscar por nombre de producto, número de pedido (#1234) o email del cliente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-600">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-600">↓</kbd>
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-600">↵</kbd>
                    abrir
                  </span>
                </div>
                <span className="text-blue-600">
                  Búsqueda inteligente
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
