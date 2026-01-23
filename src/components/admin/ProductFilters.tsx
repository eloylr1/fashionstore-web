/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Product Filters Component (React)
 * Filtros y buscador para la página de productos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';

export interface FilterState {
  search: string;
  category: string;
  status: 'all' | 'featured' | 'normal';
  stock: 'all' | 'low' | 'normal' | 'high';
}

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
  onFilterChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

export default function ProductFilters({ 
  categories, 
  onFilterChange = () => {},
  initialFilters 
}: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: initialFilters?.search || '',
    category: initialFilters?.category || '',
    status: initialFilters?.status || 'all',
    stock: initialFilters?.stock || 'all',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Debounce para la búsqueda
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedFilterChange = useCallback(
    debounce((newFilters: FilterState) => {
      onFilterChange(newFilters);
    }, 300),
    [onFilterChange]
  );

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Emitir evento global para el script de la página
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filterChange', { detail: newFilters }));
    }
    
    if (key === 'search') {
      debouncedFilterChange(newFilters);
    } else {
      onFilterChange(newFilters);
    }
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      search: '',
      category: '',
      status: 'all',
      stock: 'all',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
    
    // Emitir evento global
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filterChange', { detail: defaultFilters }));
    }
  };

  // Escuchar evento de limpiar filtros desde fuera
  useEffect(() => {
    const handleClearFilters = () => {
      const defaultFilters: FilterState = {
        search: '',
        category: '',
        status: 'all',
        stock: 'all',
      };
      setFilters(defaultFilters);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('clearFilters', handleClearFilters);
      return () => window.removeEventListener('clearFilters', handleClearFilters);
    }
  }, []);

  const hasActiveFilters = 
    filters.search || 
    filters.category || 
    filters.status !== 'all' || 
    filters.stock !== 'all';

  return (
    <div className="bg-white border border-gray-200 p-4 mb-6">
      {/* Main Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Buscar productos por nombre, descripción..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
          {filters.search && (
            <button
              onClick={() => handleFilterChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2.5 border transition-all ${
            hasActiveFilters 
              ? 'border-blue-500 text-blue-600 bg-blue-50' 
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
              {[filters.category, filters.status !== 'all', filters.stock !== 'all'].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Categoría
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value as FilterState['status'])}
                className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="all">Todos</option>
                <option value="featured">Destacados</option>
                <option value="normal">Normales</option>
              </select>
            </div>

            {/* Stock Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Stock
              </label>
              <select
                value={filters.stock}
                onChange={(e) => handleFilterChange('stock', e.target.value as FilterState['stock'])}
                className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="all">Todo el stock</option>
                <option value="low">Stock bajo (&lt;10)</option>
                <option value="normal">Stock normal (10-50)</option>
                <option value="high">Stock alto (&gt;50)</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
