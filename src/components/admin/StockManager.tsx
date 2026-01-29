/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Stock Manager Component
 * Componente para gestionar el stock de productos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  stock: number;
  sku: string;
  images: string[];
  price: number;
  category?: { name: string };
}

export default function StockManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingStock, setEditingStock] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?fields=id,name,stock,sku,images,price,category');
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
              <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-500 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-500 uppercase">SKU</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase">Stock</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase">Ajuste rápido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-charcoal-500">
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-charcoal-50">
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
