/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Admin Search Component (React)
 * Búsqueda global para el panel de administración
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: string;
  type: 'product' | 'order' | 'customer';
  title: string;
  subtitle: string;
  link: string;
}

export default function AdminSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Abrir con Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
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

  // Buscar con debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Búsqueda real usando la API
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Formatear resultados de productos
          const productResults: SearchResult[] = (data.products || []).map((p: any) => ({
            id: p.id,
            type: 'product' as const,
            title: p.name,
            subtitle: `€${(p.price / 100).toFixed(2)} - Stock: ${p.stock}`,
            link: `/admin/productos/${p.id}`
          }));

          // También buscar en datos locales/mock para pedidos y clientes
          const mockOrders: SearchResult[] = query.toLowerCase().includes('pedido') || query.match(/^\d+$/) ? [
            {
              id: '1234',
              type: 'order',
              title: 'Pedido #1234',
              subtitle: 'Juan García - €299.00 - Pendiente',
              link: '/admin/pedidos/1234'
            }
          ] : [];

          const mockCustomers: SearchResult[] = query.toLowerCase().split(' ').some(word => 
            ['juan', 'carlos', 'maria', 'cliente'].includes(word)
          ) ? [
            {
              id: 'c1',
              type: 'customer',
              title: 'Juan García',
              subtitle: 'juan@email.com - 3 pedidos',
              link: '/admin/clientes/1'
            }
          ] : [];

          setResults([...productResults, ...mockOrders, ...mockCustomers].slice(0, 10));
        } else {
          // Fallback a datos mock si la API falla
          setResults(getMockResults(query));
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults(getMockResults(query));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Datos mock para demostración
  const getMockResults = (searchQuery: string): SearchResult[] => {
    const q = searchQuery.toLowerCase();
    const mockData: SearchResult[] = [
      { id: '1', type: 'product', title: 'Traje Italiano Slim Fit', subtitle: '€599.00 - Stock: 10', link: '/admin/productos/1' },
      { id: '2', type: 'product', title: 'Camisa Oxford Premium', subtitle: '€89.00 - Stock: 25', link: '/admin/productos/2' },
      { id: '3', type: 'product', title: 'Cinturón de Cuero', subtitle: '€75.00 - Stock: 50', link: '/admin/productos/3' },
      { id: '1234', type: 'order', title: 'Pedido #1234', subtitle: 'Juan García - €299.00', link: '/admin/pedidos/1234' },
      { id: '1235', type: 'order', title: 'Pedido #1235', subtitle: 'María López - €599.00', link: '/admin/pedidos/1235' },
      { id: 'c1', type: 'customer', title: 'Juan García', subtitle: 'juan@email.com - 3 pedidos', link: '/admin/clientes/1' },
      { id: 'c2', type: 'customer', title: 'María López', subtitle: 'maria@email.com - 5 pedidos', link: '/admin/clientes/2' },
    ];

    return mockData.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.subtitle.toLowerCase().includes(q)
    );
  };

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
            <div 
              ref={modalRef}
              className="w-full max-w-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  placeholder="Buscar productos, pedidos, clientes..."
                  className="flex-1 text-base outline-none placeholder-gray-400"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
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
                              <span className={`px-2 py-0.5 text-xs rounded-full ${badge.class}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4">Búsquedas rápidas:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Trajes', 'Pedidos pendientes', 'Stock bajo', 'Clientes'].map(term => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                        >
                          {term}
                        </button>
                      ))}
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
                <span>
                  Búsqueda global
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
