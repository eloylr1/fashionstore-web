/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Stock Manager Component
 * Componente para gestionar el stock de productos con soporte de variantes
 * (talla + color) — Filtros a nivel de variante, no solo de producto
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';

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

// Umbral para considerar "stock bajo" a nivel de variante
const LOW_STOCK_THRESHOLD = 5;

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
  // Stock por variante de TODOS los productos (cargado en batch al inicio)
  const [allVariantStock, setAllVariantStock] = useState<Record<string, VariantStock[]>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const [productsRes, stockRes] = await Promise.all([
        fetch('/api/admin/products?fields=id,name,stock,sku,images,price,sizes,colors,category'),
        fetch('/api/admin/stock/summary'),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        // Agrupar por product_id
        const grouped: Record<string, VariantStock[]> = {};
        (stockData.variantStock || []).forEach((v: any) => {
          if (!grouped[v.product_id]) grouped[v.product_id] = [];
          grouped[v.product_id].push({
            size: v.size || null,
            color: v.color || null,
            stock: v.stock ?? 0,
          });
        });
        setAllVariantStock(grouped);
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

  // ─── Estadísticas a nivel de variante ────────────────────────────────
  const variantStats = useMemo(() => {
    let totalVariants = 0;
    let lowVariants = 0;
    let outVariants = 0;

    const lowProductIds = new Set<string>();
    const outProductIds = new Set<string>();

    for (const product of products) {
      const variants = allVariantStock[product.id];
      if (variants && variants.length > 0) {
        for (const v of variants) {
          totalVariants++;
          if (v.stock === 0) {
            outVariants++;
            outProductIds.add(product.id);
          } else if (v.stock <= LOW_STOCK_THRESHOLD) {
            lowVariants++;
            lowProductIds.add(product.id);
          }
        }
      } else {
        // Producto sin variantes desglosadas → usar stock total
        totalVariants++;
        if (product.stock === 0) {
          outVariants++;
          outProductIds.add(product.id);
        } else if (product.stock <= LOW_STOCK_THRESHOLD) {
          lowVariants++;
          lowProductIds.add(product.id);
        }
      }
    }

    return {
      totalVariants,
      lowVariants,
      outVariants,
      productsWithLow: lowProductIds.size,
      productsWithOut: outProductIds.size,
      lowProductIds,
      outProductIds,
    };
  }, [products, allVariantStock]);

  // Resumen de variantes por producto (para badges en la tabla)
  const getProductVariantSummary = (productId: string) => {
    const variants = allVariantStock[productId];
    if (!variants || variants.length === 0) return null;

    const low = variants.filter(v => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD);
    const out = variants.filter(v => v.stock === 0);

    return { low, out, total: variants.length, variants };
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
        setProducts(prev => prev.map(p =>
          p.id === productId ? { ...p, stock: result.totalStock } : p
        ));

        // Actualizar el cache de variantes batch
        setAllVariantStock(prev => {
          const updated = { ...prev };
          if (updated[productId]) {
            updated[productId] = updated[productId].map(v =>
              v.size === size && v.color === color ? { ...v, stock: newStock } : v
            );
          }
          return updated;
        });

        // Recargar variantes del expandido
        await loadVariantStock(productId);

        showToast(`Stock actualizado${result.notificationsSent > 0 ? `. ${result.notificationsSent} notificaciones enviadas.` : ''}`);

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
        setProducts(prev => prev.map(p =>
          p.id === productId ? { ...p, stock: newStock } : p
        ));
        showToast('Stock actualizado');
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
        setEditingStock(prev => {
          const newState = { ...prev };
          delete newState[product.id];
          return newState;
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, product: Product) => {
    if (e.key === 'Enter') handleStockBlur(product);
  };

  const adjustStock = (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    updateStock(productId, newStock);
  };

  // ─── Helpers para variantes ──────────────────────────────────────────
  const getVariantKey = (productId: string, size: string | null, color: string | null) =>
    `${productId}_${size || '_'}_${color || '_'}`;

  const hasVariants = (product: Product): boolean =>
    ((product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0)) === true;

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

  // ─── Filtrado a nivel de VARIANTE ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (filter === 'low') {
          // Productos que tengan ALGUNA variante con stock bajo O sin stock
          return variantStats.lowProductIds.has(p.id) || variantStats.outProductIds.has(p.id);
        }
        if (filter === 'out') {
          return variantStats.outProductIds.has(p.id);
        }
        return true;
      })
      .filter(p =>
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
      );
  }, [products, filter, search, variantStats]);

  // Auto-expandir productos cuando se filtra por stock bajo/sin stock
  useEffect(() => {
    if (filter === 'low' || filter === 'out') {
      filteredProducts.forEach(p => {
        if (hasVariants(p) && !expandedProducts[p.id]) {
          loadVariantStock(p.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const stats = {
    total: products.length,
    lowVariants: variantStats.lowVariants,
    outVariants: variantStats.outVariants,
    productsWithLow: variantStats.productsWithLow,
    productsWithOut: variantStats.productsWithOut,
  };

  // ─── Render ──────────────────────────────────────────────────────────
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
        <p className="text-charcoal-500 mt-1">Administra el inventario por variante (talla / color)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 border text-left transition-all rounded-lg ${filter === 'all' ? 'border-navy-600 bg-navy-50 ring-1 ring-navy-600' : 'border-charcoal-100 bg-white hover:bg-charcoal-50'}`}
        >
          <p className="text-sm text-charcoal-500">Total productos</p>
          <p className="text-2xl font-semibold text-navy-900">{stats.total}</p>
        </button>

        <button
          onClick={() => setFilter('low')}
          className={`p-4 border text-left transition-all rounded-lg ${filter === 'low' ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600' : 'border-charcoal-100 bg-white hover:bg-charcoal-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal-500">
                Variantes stock bajo (≤{LOW_STOCK_THRESHOLD})
              </p>
              <p className="text-2xl font-semibold text-amber-600">
                {stats.lowVariants + stats.outVariants}
              </p>
            </div>
            {(stats.productsWithLow + stats.productsWithOut) > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {stats.productsWithLow + stats.productsWithOut} prod.
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setFilter('out')}
          className={`p-4 border text-left transition-all rounded-lg ${filter === 'out' ? 'border-red-600 bg-red-50 ring-1 ring-red-600' : 'border-charcoal-100 bg-white hover:bg-charcoal-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal-500">Variantes sin stock</p>
              <p className="text-2xl font-semibold text-red-600">{stats.outVariants}</p>
            </div>
            {stats.productsWithOut > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {stats.productsWithOut} prod.
              </span>
            )}
          </div>
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
            className="w-full pl-10 pr-4 py-2.5 border border-charcoal-200 rounded-lg focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
          />
        </div>
        {(filter !== 'all' || search) && (
          <button
            onClick={() => { setFilter('all'); setSearch(''); }}
            className="px-4 py-2.5 text-charcoal-600 hover:text-navy-600 border border-charcoal-200 hover:border-navy-300 rounded-lg transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-charcoal-100 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-charcoal-50 border-b border-charcoal-100">
            <tr>
              <th className="px-2 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-500 uppercase tracking-wider">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-charcoal-500 uppercase tracking-wider">SKU</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase tracking-wider">Variantes</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase tracking-wider">Stock Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase tracking-wider">Estado Variantes</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-charcoal-500 uppercase tracking-wider">Ajuste rápido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-charcoal-500">
                  {filter !== 'all'
                    ? 'No se encontraron productos con este filtro de stock'
                    : 'No se encontraron productos'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const summary = getProductVariantSummary(product.id);
                return (
                  <ProductRow
                    key={product.id}
                    product={product}
                    summary={summary}
                    expandedProducts={expandedProducts}
                    editingStock={editingStock}
                    editingVariantStock={editingVariantStock}
                    saving={saving}
                    hasVariants={hasVariants}
                    toggleExpand={toggleExpand}
                    handleStockChange={handleStockChange}
                    handleStockBlur={handleStockBlur}
                    handleKeyDown={handleKeyDown}
                    adjustStock={adjustStock}
                    getVariantKey={getVariantKey}
                    getVariantStock={getVariantStock}
                    getPendingCount={getPendingCount}
                    handleVariantStockChange={handleVariantStockChange}
                    handleVariantStockBlur={handleVariantStockBlur}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            <strong>Consejo:</strong> Los filtros funcionan a nivel de{' '}
            <strong>variante</strong> (talla/color), no solo del producto total.
          </p>
          <p>
            Haz clic en la flecha para expandir y editar el stock de cada talla/color.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right">
          <div className={`${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={toast.type === 'error' ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'} />
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Subcomponente: ProductRow  (producto + variantes expandidas)
 * ═══════════════════════════════════════════════════════════════════════════ */

interface ProductRowProps {
  product: Product;
  summary: { low: VariantStock[]; out: VariantStock[]; total: number; variants: VariantStock[] } | null;
  expandedProducts: Record<string, ExpandedProduct>;
  editingStock: Record<string, string>;
  editingVariantStock: Record<string, string>;
  saving: string | null;
  hasVariants: (p: Product) => boolean;
  toggleExpand: (id: string) => void;
  handleStockChange: (id: string, v: string) => void;
  handleStockBlur: (p: Product) => void;
  handleKeyDown: (e: React.KeyboardEvent, p: Product) => void;
  adjustStock: (id: string, stock: number, delta: number) => void;
  getVariantKey: (id: string, s: string | null, c: string | null) => string;
  getVariantStock: (id: string, s: string | null, c: string | null) => number;
  getPendingCount: (id: string, s: string | null, c: string | null) => number;
  handleVariantStockChange: (key: string, v: string) => void;
  handleVariantStockBlur: (id: string, s: string | null, c: string | null) => void;
}

function ProductRow({
  product,
  summary,
  expandedProducts,
  editingStock,
  editingVariantStock,
  saving,
  hasVariants: hasVariantsFn,
  toggleExpand,
  handleStockChange,
  handleStockBlur,
  handleKeyDown,
  adjustStock,
  getVariantKey,
  getVariantStock: getVariantStockFn,
  getPendingCount,
  handleVariantStockChange,
  handleVariantStockBlur,
}: ProductRowProps) {
  const expanded = expandedProducts[product.id];

  return (
    <>
      <tr className={`hover:bg-charcoal-50 transition-colors ${
        summary && summary.out.length > 0 ? 'bg-red-50/30' :
        summary && summary.low.length > 0 ? 'bg-amber-50/30' : ''
      }`}>
        {/* Expand button */}
        <td className="px-2 py-3">
          {hasVariantsFn(product) && (
            <button
              onClick={() => toggleExpand(product.id)}
              className="p-1 hover:bg-charcoal-100 rounded transition-colors"
              title={expanded ? 'Contraer' : 'Ver stock por variantes'}
            >
              <svg
                className={`w-5 h-5 text-charcoal-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </td>

        {/* Product info */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {product.images?.[0] ? (
              <>
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-10 h-10 object-cover rounded bg-charcoal-100"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-10 h-10 bg-charcoal-100 rounded items-center justify-center" style={{ display: 'none' }}>
                  <svg className="w-5 h-5 text-charcoal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </>
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

        {/* SKU */}
        <td className="px-4 py-3 text-sm text-charcoal-600">{product.sku || '-'}</td>

        {/* Variantes count */}
        <td className="px-4 py-3 text-center">
          {hasVariantsFn(product) ? (
            <div className="flex items-center justify-center gap-2 text-xs">
              {product.sizes && product.sizes.length > 0 && (
                <span className="bg-charcoal-100 px-2 py-0.5 rounded">{product.sizes.length} tallas</span>
              )}
              {product.colors && product.colors.length > 0 && (
                <span className="bg-charcoal-100 px-2 py-0.5 rounded">{product.colors.length} colores</span>
              )}
            </div>
          ) : (
            <span className="text-charcoal-400 text-sm">-</span>
          )}
        </td>

        {/* Stock total */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-center">
            {hasVariantsFn(product) ? (
              <span
                className={`w-20 text-center px-2 py-1 border rounded text-sm font-medium cursor-default ${
                  product.stock === 0
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : product.stock <= 10
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-charcoal-200 bg-charcoal-50 text-charcoal-600'
                }`}
                title="Stock total calculado desde variantes"
              >
                {product.stock}
              </span>
            ) : (
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
            )}
          </div>
        </td>

        {/* Estado variantes */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {summary ? (
              <>
                {summary.out.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full"
                    title={summary.out.map(v => `${v.size || ''}${v.size && v.color ? ' / ' : ''}${v.color || ''}`).join(', ')}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {summary.out.length} sin stock
                  </span>
                )}
                {summary.low.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full"
                    title={summary.low.map(v => `${v.size || ''}${v.size && v.color ? ' / ' : ''}${v.color || ''}: ${v.stock} uds`).join(', ')}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {summary.low.length} bajo
                  </span>
                )}
                {summary.out.length === 0 && summary.low.length === 0 && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    OK
                  </span>
                )}
              </>
            ) : (
              <span className="text-charcoal-400 text-xs">-</span>
            )}
          </div>
        </td>

        {/* Ajuste rápido */}
        <td className="px-4 py-3">
          {hasVariantsFn(product) ? (
            <button
              onClick={() => toggleExpand(product.id)}
              className="text-xs text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1 mx-auto transition-colors"
              title="Expandir para editar stock por variante"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Editar variantes
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => adjustStock(product.id, product.stock, -10)}
                disabled={saving === product.id || product.stock < 10}
                className="px-2 py-1 text-xs bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-600 disabled:opacity-50 rounded transition-colors"
              >-10</button>
              <button
                onClick={() => adjustStock(product.id, product.stock, -1)}
                disabled={saving === product.id || product.stock < 1}
                className="px-2 py-1 text-xs bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-600 disabled:opacity-50 rounded transition-colors"
              >-1</button>
              <button
                onClick={() => adjustStock(product.id, product.stock, 1)}
                disabled={saving === product.id}
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 rounded transition-colors"
              >+1</button>
              <button
                onClick={() => adjustStock(product.id, product.stock, 10)}
                disabled={saving === product.id}
                className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 rounded transition-colors"
              >+10</button>
            </div>
          )}
        </td>
      </tr>

      {/* ── Filas expandidas: variantes ─────────────────────────────── */}
      {expanded && (
        expanded.loading ? (
          <tr className="bg-charcoal-50">
            <td colSpan={7} className="px-8 py-4 text-center">
              <div className="flex items-center justify-center gap-2 text-charcoal-500">
                <div className="w-4 h-4 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div>
                Cargando variantes...
              </div>
            </td>
          </tr>
        ) : (
          <tr className="bg-charcoal-50/50">
            <td></td>
            <td colSpan={6} className="px-4 py-3">
              <div className="bg-white border border-charcoal-200 rounded-lg overflow-hidden">
                {/* Cabecera con leyenda */}
                <div className="bg-navy-50 px-4 py-2 border-b border-charcoal-200 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-navy-900">Stock por Variante</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> OK
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bajo (≤{LOW_STOCK_THRESHOLD})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Sin stock
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {/* ─── Matriz talla × color ────────────────────────── */}
                  {product.sizes && product.sizes.length > 0 && product.colors && product.colors.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-charcoal-500 bg-charcoal-50 rounded-tl">Talla / Color</th>
                            {product.colors.map(color => (
                              <th key={color} className="px-3 py-2 text-center text-xs font-medium text-charcoal-500 bg-charcoal-50">{color}</th>
                            ))}
                            <th className="px-3 py-2 text-center text-xs font-medium text-navy-600 bg-navy-50 rounded-tr">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-charcoal-100">
                          {product.sizes.map(size => {
                            const sizeTotal = product.colors!.reduce(
                              (sum, color) => sum + getVariantStockFn(product.id, size, color), 0
                            );
                            return (
                              <tr key={size}>
                                <td className="px-3 py-2 font-medium text-charcoal-700 bg-charcoal-50">{size}</td>
                                {product.colors!.map(color => {
                                  const key = getVariantKey(product.id, size, color);
                                  const stock = getVariantStockFn(product.id, size, color);
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
                                          className={`w-16 text-center px-2 py-1 border rounded text-sm font-medium transition-colors ${
                                            stock === 0
                                              ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200'
                                              : stock <= LOW_STOCK_THRESHOLD
                                                ? 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                                : 'border-charcoal-200 hover:border-charcoal-300'
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
                                <td className="px-3 py-2 text-center bg-navy-50/50">
                                  <span className={`font-semibold text-sm ${
                                    sizeTotal === 0 ? 'text-red-600' : sizeTotal <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : 'text-navy-700'
                                  }`}>{sizeTotal}</span>
                                </td>
                              </tr>
                            );
                          })}
                          {/* Fila de totales por color */}
                          <tr className="bg-navy-50/50 border-t-2 border-charcoal-200">
                            <td className="px-3 py-2 font-medium text-navy-700 text-xs uppercase">Total</td>
                            {product.colors!.map(color => {
                              const colTotal = product.sizes!.reduce(
                                (sum, size) => sum + getVariantStockFn(product.id, size, color), 0
                              );
                              return (
                                <td key={color} className="px-3 py-2 text-center">
                                  <span className={`font-semibold text-sm ${
                                    colTotal === 0 ? 'text-red-600' : colTotal <= LOW_STOCK_THRESHOLD ? 'text-amber-600' : 'text-navy-700'
                                  }`}>{colTotal}</span>
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center">
                              <span className="font-bold text-sm text-navy-900">{product.stock}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : product.sizes && product.sizes.length > 0 ? (
                    /* ─── Solo tallas ─────────────────────────────── */
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {product.sizes.map(size => {
                        const key = getVariantKey(product.id, size, null);
                        const stock = getVariantStockFn(product.id, size, null);
                        const pending = getPendingCount(product.id, size, null);
                        const isSaving = saving === key;
                        return (
                          <div key={size} className="relative">
                            <label className="text-xs text-charcoal-500 block mb-1 font-medium">{size}</label>
                            <input
                              type="number"
                              min="0"
                              value={editingVariantStock[key] !== undefined ? editingVariantStock[key] : stock}
                              onChange={(e) => handleVariantStockChange(key, e.target.value)}
                              onBlur={() => handleVariantStockBlur(product.id, size, null)}
                              onKeyDown={(e) => e.key === 'Enter' && handleVariantStockBlur(product.id, size, null)}
                              className={`w-full text-center px-2 py-1.5 border rounded text-sm font-medium transition-colors ${
                                stock === 0
                                  ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200'
                                  : stock <= LOW_STOCK_THRESHOLD
                                    ? 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                    : 'border-charcoal-200 hover:border-charcoal-300'
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
                    /* ─── Solo colores ────────────────────────────── */
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {product.colors.map(color => {
                        const key = getVariantKey(product.id, null, color);
                        const stock = getVariantStockFn(product.id, null, color);
                        const pending = getPendingCount(product.id, null, color);
                        const isSaving = saving === key;
                        return (
                          <div key={color} className="relative">
                            <label className="text-xs text-charcoal-500 block mb-1 font-medium">{color}</label>
                            <input
                              type="number"
                              min="0"
                              value={editingVariantStock[key] !== undefined ? editingVariantStock[key] : stock}
                              onChange={(e) => handleVariantStockChange(key, e.target.value)}
                              onBlur={() => handleVariantStockBlur(product.id, null, color)}
                              onKeyDown={(e) => e.key === 'Enter' && handleVariantStockBlur(product.id, null, color)}
                              className={`w-full text-center px-2 py-1.5 border rounded text-sm font-medium transition-colors ${
                                stock === 0
                                  ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200'
                                  : stock <= LOW_STOCK_THRESHOLD
                                    ? 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                    : 'border-charcoal-200 hover:border-charcoal-300'
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
        )
      )}
    </>
  );
}
