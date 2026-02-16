/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Stock Manager Component
 * Componente para gestionar el stock de productos con soporte de variantes
 * (talla + color)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

interface VariantStock {
  size: string | null;
  color: string | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  sku: string;
  images: string[];
  price: number;
  sizes?: string[];
  colors?: string[];
  category?: { name: string };
}

interface ExpandedProduct {
  variants: VariantStock[];
  pendingNotifications: Record<string, number>;
  loading: boolean;
}

export default function StockManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingStock, setEditingStock] = useState<{ [key: string]: string }>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, ExpandedProduct>>({});
  const [editingVariantStock, setEditingVariantStock] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?fields=id,name,stock,sku,images,price,sizes,colors,category');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Cargar stock de variantes para un producto expandido
  const loadVariantStock = async (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: { variants: [], pendingNotifications: {}, loading: true }
    }));

    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`);
      if (res.ok) {
        const data = await res.json();
        setExpandedProducts(prev => ({
          ...prev,
          [productId]: {
            variants: data.stockByVariant || [],
            pendingNotifications: data.pendingNotifications || {},
            loading: false
          }
        }));
      }
    } catch (error) {
      console.error('Error loading variant stock:', error);
      setExpandedProducts(prev => ({
        ...prev,
        [productId]: { variants: [], pendingNotifications: {}, loading: false }
      }));
    }
  };

  // Toggle expandir producto
  const toggleExpand = (productId: string) => {
    if (expandedProducts[productId]) {
      setExpandedProducts(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
    } else {
      loadVariantStock(productId);
    }
  };

  // Actualizar stock de una variante específica
  const updateVariantStock = async (productId: string, size: string | null, color: string | null, newStock: number) => {
    setSaving(`${productId}_${size || '_'}_${color || '_'}`);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ size, color, stock: newStock }]
        }),
      });

      if (res.ok) {
        const result = await res.json();
        
        // Actualizar stock total del producto
        setProducts(products.map(p => 
          p.id === productId ? { ...p, stock: result.totalStock } : p
        ));

        // Recargar variantes
        await loadVariantStock(productId);
        
        showToast(`Stock actualizado${result.notificationsSent > 0 ? `. ${result.notificationsSent} notificaciones enviadas.` : ''}`);
        
        // Limpiar edición
        const editKey = `${productId}_${size || '_'}_${color || '_'}`;
        setEditingVariantStock(prev => {
          const newState = { ...prev };
          delete newState[editKey];
          return newState;
        });
      } else {
        showToast('Error al actualizar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(null);
    }
  };

  const updateStock = async (productId: string, newStock: number) => {
    setSaving(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });

      if (res.ok) {
        setProducts(products.map(p => 
          p.id === productId ? { ...p, stock: newStock } : p
        ));
        showToast('Stock actualizado');
        // Limpiar el campo de edición
        setEditingStock(prev => {
          const newState = { ...prev };
          delete newState[productId];
          return newState;
        });
      } else {
        showToast('Error al actualizar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleStockChange = (productId: string, value: string) => {
    setEditingStock(prev => ({ ...prev, [productId]: value }));
  };

  const handleStockBlur = (product: Product) => {
    const newStockStr = editingStock[product.id];
    if (newStockStr !== undefined) {
      const newStock = parseInt(newStockStr);
      if (!isNaN(newStock) && newStock !== product.stock && newStock >= 0) {
        updateStock(product.id, newStock);
      } else {
        // Restaurar valor original
        setEditingStock(prev => {
          const newState = { ...prev };
          delete newState[product.id];
          return newState;
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, product: Product) => {
    if (e.key === 'Enter') {
      handleStockBlur(product);
    }
  };

  const adjustStock = (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    updateStock(productId, newStock);
  };

  // Helpers para variantes
  const getVariantKey = (productId: string, size: string | null, color: string | null) => 
    `${productId}_${size || '_'}_${color || '_'}`;

  const hasVariants = (product: Product) => 
    (product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0);

  const getVariantStock = (productId: string, size: string | null, color: string | null): number => {
    const expanded = expandedProducts[productId];
    if (!expanded) return 0;
    const variant = expanded.variants.find(v => v.size === size && v.color === color);
    return variant?.stock || 0;
  };

  const handleVariantStockChange = (key: string, value: string) => {
    setEditingVariantStock(prev => ({ ...prev, [key]: value }));
  };

  const handleVariantStockBlur = (productId: string, size: string | null, color: string | null) => {
    const key = getVariantKey(productId, size, color);
    const newStockStr = editingVariantStock[key];
    if (newStockStr !== undefined) {
      const newStock = parseInt(newStockStr);
      const currentStock = getVariantStock(productId, size, color);
      if (!isNaN(newStock) && newStock !== currentStock && newStock >= 0) {
        updateVariantStock(productId, size, color, newStock);
      } else {
        setEditingVariantStock(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      }
    }
  };

  const getPendingCount = (productId: string, size: string | null, color: string | null): number => {
    const expanded = expandedProducts[productId];
    if (!expanded) return 0;
    const key = `${size || '_'}_${color || '_'}`;
    return expanded.pendingNotifications[key] || 0;
  };

  // Filtrar productos
  const filteredProducts = products
    .filter(p => {
      if (filter === 'low') return p.stock > 0 && p.stock <= 10;
      if (filter === 'out') return p.stock === 0;
      return true;
    })
    .filter(p => 
      search === '' || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );

  // Estadísticas
  const stats = {
    total: products.length,
    low: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    out: products.filter(p => p.stock === 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Gestión de Stock</h1>
        <p className="text-charcoal-500 mt-1">Administra el inventario de tus productos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 border text-left transition-all ${filter === 'all' ? 'border-navy-600 bg-navy-50' : 'border-charcoal-100 bg-white hover:bg-charcoal-50'}`}
        >
          <p className="text-sm text-charcoal-500">Total productos</p>
          <p className="text-2xl font-semibold text-navy-900">{stats.total}</p>
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`p-4 border text-left transition-all ${filter === 'low' ? 'border-amber-600 bg-amber-50' : 'border-charcoal-100 bg-white hover:bg-charcoal-50'}`}
        >
          <p className="text-sm text-charcoal-500">Stock bajo (≤10)</p>
          <p className="text-2xl font-semibold text-amber-600">{stats.low}</p>
        </button>
        <button
          onClick={() => setFilter('out')}
          className={`p-4 border text-left transition-all ${filter === 'out' ? 'border-red-600 bg-red-50' : 'border-charcoal-100 bg-white hover:bg-charcoal-50'}`}
        >
          <p className="text-sm text-charcoal-500">Sin stock</p>
          <p className="text-2xl font-semibold text-red-600">{stats.out}</p>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-charcoal-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
          />
        </div>
        {(filter !== 'all' || search) && (
          <button
            onClick={() => { setFilter('all'); setSearch(''); }}
            className="px-4 py-2 text-charcoal-600 hover:text-navy-600 border border-charcoal-200 hover:border-navy-300 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-charcoal-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-charcoal-50 border-b border-charcoal-100">
            <tr>
              <th className="px-2 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-500 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-500 uppercase">SKU</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase">Variantes</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase">Stock Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase">Ajuste rápido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-charcoal-500">
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <>
                <tr key={product.id} className="hover:bg-charcoal-50">
                  <td className="px-2 py-3">
                    {hasVariants(product) && (
                      <button
                        onClick={() => toggleExpand(product.id)}
                        className="p-1 hover:bg-charcoal-100 rounded transition-colors"
                        title={expandedProducts[product.id] ? 'Contraer' : 'Ver stock por variantes'}
                      >
                        <svg 
                          className={`w-5 h-5 text-charcoal-500 transition-transform ${expandedProducts[product.id] ? 'rotate-90' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-charcoal-100 rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-navy-900">{product.name}</p>
                        <p className="text-xs text-charcoal-400">{(product.price / 100).toFixed(2)}€</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-charcoal-600">
                    {product.sku || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasVariants(product) ? (
                      <div className="flex items-center justify-center gap-2 text-xs">
                        {product.sizes && product.sizes.length > 0 && (
                          <span className="bg-charcoal-100 px-2 py-0.5 rounded">
                            {product.sizes.length} tallas
                          </span>
                        )}
                        {product.colors && product.colors.length > 0 && (
                          <span className="bg-charcoal-100 px-2 py-0.5 rounded">
                            {product.colors.length} colores
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-charcoal-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <input
                        type="number"
                        min="0"
                        value={editingStock[product.id] !== undefined ? editingStock[product.id] : product.stock}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        onBlur={() => handleStockBlur(product)}
                        onKeyDown={(e) => handleKeyDown(e, product)}
                        className={`w-20 text-center px-2 py-1 border rounded text-sm font-medium ${
                          product.stock === 0 
                            ? 'border-red-300 bg-red-50 text-red-700' 
                            : product.stock <= 10 
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-charcoal-200 text-charcoal-700'
                        } ${saving === product.id ? 'opacity-50' : ''}`}
                        disabled={saving === product.id}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => adjustStock(product.id, product.stock, -10)}
                        disabled={saving === product.id || product.stock < 10}
                        className="px-2 py-1 text-xs bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-600 disabled:opacity-50 rounded transition-colors"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => adjustStock(product.id, product.stock, -1)}
                        disabled={saving === product.id || product.stock < 1}
                        className="px-2 py-1 text-xs bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-600 disabled:opacity-50 rounded transition-colors"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => adjustStock(product.id, product.stock, 1)}
                        disabled={saving === product.id}
                        className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 rounded transition-colors"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => adjustStock(product.id, product.stock, 10)}
                        disabled={saving === product.id}
                        className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 rounded transition-colors"
                      >
                        +10
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Filas expandidas de variantes */}
                {expandedProducts[product.id] && (
                  expandedProducts[product.id].loading ? (
                    <tr key={`${product.id}-loading`} className="bg-charcoal-50">
                      <td colSpan={6} className="px-8 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-charcoal-500">
                          <div className="w-4 h-4 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div>
                          Cargando variantes...
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Mostrar variantes en una subtabla */}
                      <tr key={`${product.id}-variants`} className="bg-charcoal-50/50">
                        <td></td>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="bg-white border border-charcoal-200 rounded-lg overflow-hidden">
                            <div className="bg-navy-50 px-4 py-2 border-b border-charcoal-200">
                              <h4 className="text-sm font-medium text-navy-900">Stock por Variante</h4>
                            </div>
                            <div className="p-4">
                              {/* Grid de variantes */}
                              {product.sizes && product.sizes.length > 0 && product.colors && product.colors.length > 0 ? (
                                // Matriz talla x color
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-charcoal-500 bg-charcoal-50">Talla / Color</th>
                                        {product.colors.map(color => (
                                          <th key={color} className="px-3 py-2 text-center text-xs font-medium text-charcoal-500 bg-charcoal-50">{color}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-charcoal-100">
                                      {product.sizes.map(size => (
                                        <tr key={size}>
                                          <td className="px-3 py-2 font-medium text-charcoal-700 bg-charcoal-50">{size}</td>
                                          {product.colors!.map(color => {
                                            const key = getVariantKey(product.id, size, color);
                                            const stock = getVariantStock(product.id, size, color);
                                            const pending = getPendingCount(product.id, size, color);
                                            const isSaving = saving === key;
                                            return (
                                              <td key={color} className="px-3 py-2 text-center relative">
                                                <div className="flex items-center justify-center gap-1">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={editingVariantStock[key] !== undefined ? editingVariantStock[key] : stock}
                                                    onChange={(e) => handleVariantStockChange(key, e.target.value)}
                                                    onBlur={() => handleVariantStockBlur(product.id, size, color)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleVariantStockBlur(product.id, size, color)}
                                                    className={`w-16 text-center px-2 py-1 border rounded text-sm ${
                                                      stock === 0 
                                                        ? 'border-red-300 bg-red-50 text-red-700' 
                                                        : stock <= 5 
                                                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                          : 'border-charcoal-200'
                                                    } ${isSaving ? 'opacity-50' : ''}`}
                                                    disabled={isSaving}
                                                  />
                                                  {pending > 0 && (
                                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" title={`${pending} esperando stock`}>
                                                      {pending}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : product.sizes && product.sizes.length > 0 ? (
                                // Solo tallas
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                  {product.sizes.map(size => {
                                    const key = getVariantKey(product.id, size, null);
                                    const stock = getVariantStock(product.id, size, null);
                                    const pending = getPendingCount(product.id, size, null);
                                    const isSaving = saving === key;
                                    return (
                                      <div key={size} className="relative">
                                        <label className="text-xs text-charcoal-500 block mb-1">{size}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={editingVariantStock[key] !== undefined ? editingVariantStock[key] : stock}
                                          onChange={(e) => handleVariantStockChange(key, e.target.value)}
                                          onBlur={() => handleVariantStockBlur(product.id, size, null)}
                                          onKeyDown={(e) => e.key === 'Enter' && handleVariantStockBlur(product.id, size, null)}
                                          className={`w-full text-center px-2 py-1 border rounded text-sm ${
                                            stock === 0 
                                              ? 'border-red-300 bg-red-50 text-red-700' 
                                              : stock <= 5 
                                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                : 'border-charcoal-200'
                                          } ${isSaving ? 'opacity-50' : ''}`}
                                          disabled={isSaving}
                                        />
                                        {pending > 0 && (
                                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" title={`${pending} esperando stock`}>
                                            {pending}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : product.colors && product.colors.length > 0 ? (
                                // Solo colores
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                  {product.colors.map(color => {
                                    const key = getVariantKey(product.id, null, color);
                                    const stock = getVariantStock(product.id, null, color);
                                    const pending = getPendingCount(product.id, null, color);
                                    const isSaving = saving === key;
                                    return (
                                      <div key={color} className="relative">
                                        <label className="text-xs text-charcoal-500 block mb-1">{color}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={editingVariantStock[key] !== undefined ? editingVariantStock[key] : stock}
                                          onChange={(e) => handleVariantStockChange(key, e.target.value)}
                                          onBlur={() => handleVariantStockBlur(product.id, null, color)}
                                          onKeyDown={(e) => e.key === 'Enter' && handleVariantStockBlur(product.id, null, color)}
                                          className={`w-full text-center px-2 py-1 border rounded text-sm ${
                                            stock === 0 
                                              ? 'border-red-300 bg-red-50 text-red-700' 
                                              : stock <= 5 
                                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                : 'border-charcoal-200'
                                          } ${isSaving ? 'opacity-50' : ''}`}
                                          disabled={isSaving}
                                        />
                                        {pending > 0 && (
                                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" title={`${pending} esperando stock`}>
                                            {pending}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-charcoal-500 text-sm">Sin variantes</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </>
                  )
                )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tip */}
      <div className="bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-800">
          <strong>Tip:</strong> Haz clic en el número de stock para editarlo directamente, o usa los botones de ajuste rápido para incrementar/decrementar.
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={toast.type === 'error' ? "M6 18L18 6M6 6l12 12" : "M5 13l4 4L19 7"} />
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
