/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Variant Stock Manager Component
 * Componente para gestionar el stock por talla Y color de un producto
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

interface VariantStock {
  size: string | null;
  color: string | null;
  stock: number;
}

interface PendingNotifications {
  [key: string]: number; // key = "size_color"
}

interface VariantStockManagerProps {
  productId: string;
  sizes: string[];
  colors: string[];
  productName?: string;
  onStockChange?: (totalStock: number) => void;
}

export default function VariantStockManager({ 
  productId, 
  sizes = [], 
  colors = [],
  productName = 'Producto',
  onStockChange 
}: VariantStockManagerProps) {
  const [stockByVariant, setStockByVariant] = useState<VariantStock[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotifications>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalStock, setOriginalStock] = useState<VariantStock[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const hasSizes = sizes.length > 0;
  const hasColors = colors.length > 0;

  useEffect(() => {
    loadStockData();
  }, [productId]);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/products/${productId}/stock`);
      
      if (res.ok) {
        const data = await res.json();
        const stockData = data.stockByVariant || data.stockBySize || [];
        
        // Generar todas las variantes posibles
        const allVariants = generateAllVariants();
        
        // Mapear datos existentes
        const fullStockData = allVariants.map(variant => {
          const existing = stockData.find((s: VariantStock) => 
            s.size === variant.size && s.color === variant.color
          );
          return existing || { ...variant, stock: 0 };
        });
        
        setStockByVariant(fullStockData);
        setOriginalStock(JSON.parse(JSON.stringify(fullStockData)));
        setPendingNotifications(data.pendingNotifications || {});
      } else {
        // Si no hay datos, crear estructura vacía
        const emptyStock = generateAllVariants().map(v => ({ ...v, stock: 0 }));
        setStockByVariant(emptyStock);
        setOriginalStock(JSON.parse(JSON.stringify(emptyStock)));
      }
    } catch (error) {
      console.error('Error loading stock:', error);
      showToast('Error al cargar stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateAllVariants = (): VariantStock[] => {
    const variants: VariantStock[] = [];
    
    if (hasSizes && hasColors) {
      // Variantes con talla Y color
      sizes.forEach(size => {
        colors.forEach(color => {
          variants.push({ size, color, stock: 0 });
        });
      });
    } else if (hasSizes) {
      // Solo tallas
      sizes.forEach(size => {
        variants.push({ size, color: null, stock: 0 });
      });
    } else if (hasColors) {
      // Solo colores
      colors.forEach(color => {
        variants.push({ size: null, color, stock: 0 });
      });
    }
    
    return variants;
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getVariantKey = (size: string | null, color: string | null) => {
    return `${size || '_'}_${color || '_'}`;
  };

  const handleStockChange = (size: string | null, color: string | null, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockByVariant(prev => 
      prev.map(item => 
        item.size === size && item.color === color 
          ? { ...item, stock: Math.max(0, numValue) } 
          : item
      )
    );
    setHasChanges(true);
  };

  const incrementStock = (size: string | null, color: string | null, amount: number) => {
    setStockByVariant(prev => 
      prev.map(item => 
        item.size === size && item.color === color 
          ? { ...item, stock: Math.max(0, item.stock + amount) } 
          : item
      )
    );
    setHasChanges(true);
  };

  const setAllStock = (value: number) => {
    setStockByVariant(prev => prev.map(item => ({ ...item, stock: Math.max(0, value) })));
    setHasChanges(true);
  };

  const resetChanges = () => {
    setStockByVariant(JSON.parse(JSON.stringify(originalStock)));
    setHasChanges(false);
  };

  const saveAllStock = async () => {
    setSaving(true);
    try {
      const updates = stockByVariant.map(item => ({
        size: item.size,
        color: item.color,
        stock: item.stock
      }));

      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        const data = await res.json();
        setOriginalStock(JSON.parse(JSON.stringify(stockByVariant)));
        setHasChanges(false);
        
        if (onStockChange) {
          onStockChange(data.totalStock);
        }
        
        if (data.notificationsSent > 0) {
          showToast(`Stock actualizado. ${data.notificationsSent} clientes notificados.`, 'success');
        } else {
          showToast('Stock actualizado correctamente', 'success');
        }
        
        loadStockData();
      } else {
        showToast('Error al guardar', 'error');
      }
    } catch (error) {
      console.error('Error saving stock:', error);
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calcular totales
  const totalStock = stockByVariant.reduce((sum, item) => sum + item.stock, 0);
  const variantsWithStock = stockByVariant.filter(item => item.stock > 0).length;
  const variantsOutOfStock = stockByVariant.filter(item => item.stock === 0).length;
  const totalPendingNotifications = Object.values(pendingNotifications).reduce((sum, count) => sum + count, 0);

  // Agrupar stock por talla (para vista resumida)
  const stockBySizeOnly = sizes.map(size => ({
    size,
    totalStock: stockByVariant
      .filter(v => v.size === size)
      .reduce((sum, v) => sum + v.stock, 0),
    variants: stockByVariant.filter(v => v.size === size)
  }));

  // Agrupar stock por color (para vista resumida)
  const stockByColorOnly = colors.map(color => ({
    color,
    totalStock: stockByVariant
      .filter(v => v.color === color)
      .reduce((sum, v) => sum + v.stock, 0),
    variants: stockByVariant.filter(v => v.color === color)
  }));

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-charcoal-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-charcoal-200 rounded w-1/3"></div>
          <div className="grid grid-cols-5 gap-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-20 bg-charcoal-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-charcoal-200 overflow-hidden">
      {/* Header - Con colores corregidos para visibilidad */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Stock por {hasSizes && hasColors ? 'Talla y Color' : hasSizes ? 'Talla' : 'Color'}
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              Gestiona el inventario de cada variante individualmente
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{totalStock}</p>
              <p className="text-xs text-gray-300">unidades totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-charcoal-50 border-b border-charcoal-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-charcoal-500">Con stock</p>
            <p className="font-semibold text-charcoal-800">{variantsWithStock} variantes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-charcoal-500">Agotadas</p>
            <p className="font-semibold text-charcoal-800">{variantsOutOfStock} variantes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-charcoal-500">Esperando</p>
            <p className="font-semibold text-charcoal-800">{totalPendingNotifications} clientes</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-3 bg-white border-b border-charcoal-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal-600">Stock rápido:</span>
          <button
            type="button"
            onClick={() => setAllStock(0)}
            className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Todo a 0
          </button>
          <button
            type="button"
            onClick={() => setAllStock(5)}
            className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
          >
            Todo a 5
          </button>
          <button
            type="button"
            onClick={() => setAllStock(10)}
            className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Todo a 10
          </button>
        </div>
        
        {hasSizes && hasColors && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-navy-100 text-navy-700' : 'text-charcoal-500 hover:bg-charcoal-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-navy-100 text-navy-700' : 'text-charcoal-500 hover:bg-charcoal-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Stock Grid/Table */}
      <div className="p-6">
        {hasSizes && hasColors ? (
          viewMode === 'table' ? (
            // Vista de tabla para talla + color
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 bg-charcoal-100 border border-charcoal-200 text-left text-sm font-medium text-charcoal-700">
                      Talla / Color
                    </th>
                    {colors.map(color => (
                      <th key={color} className="p-2 bg-charcoal-100 border border-charcoal-200 text-center text-sm font-medium text-charcoal-700">
                        {color}
                      </th>
                    ))}
                    <th className="p-2 bg-charcoal-100 border border-charcoal-200 text-center text-sm font-medium text-charcoal-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockBySizeOnly.map(({ size, totalStock: sizeTotal, variants }) => (
                    <tr key={size}>
                      <td className="p-2 border border-charcoal-200 font-medium text-charcoal-800 bg-charcoal-50">
                        {size}
                      </td>
                      {colors.map(color => {
                        const variant = variants.find(v => v.color === color);
                        const stock = variant?.stock || 0;
                        const isOutOfStock = stock === 0;
                        const isLowStock = stock > 0 && stock <= 3;
                        
                        return (
                          <td key={color} className="p-1 border border-charcoal-200">
                            <input
                              type="number"
                              value={stock}
                              onChange={(e) => handleStockChange(size, color, e.target.value)}
                              min="0"
                              className={`
                                w-full px-2 py-1 text-center text-sm font-medium rounded
                                focus:outline-none focus:ring-2
                                ${isOutOfStock 
                                  ? 'bg-red-50 text-red-700 focus:ring-red-300' 
                                  : isLowStock 
                                    ? 'bg-amber-50 text-amber-700 focus:ring-amber-300' 
                                    : 'bg-white text-charcoal-800 focus:ring-navy-300'
                                }
                              `}
                            />
                          </td>
                        );
                      })}
                      <td className="p-2 border border-charcoal-200 text-center font-semibold text-charcoal-800 bg-charcoal-50">
                        {sizeTotal}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-charcoal-100">
                    <td className="p-2 border border-charcoal-200 font-medium text-charcoal-700">
                      Total
                    </td>
                    {stockByColorOnly.map(({ color, totalStock: colorTotal }) => (
                      <td key={color} className="p-2 border border-charcoal-200 text-center font-semibold text-charcoal-800">
                        {colorTotal}
                      </td>
                    ))}
                    <td className="p-2 border border-charcoal-200 text-center font-bold text-navy-800">
                      {totalStock}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            // Vista de grid para talla + color
            <div className="space-y-6">
              {sizes.map(size => (
                <div key={size} className="border border-charcoal-200 rounded-lg overflow-hidden">
                  <div className="bg-charcoal-100 px-4 py-2 flex items-center justify-between">
                    <span className="font-medium text-charcoal-800">Talla: {size}</span>
                    <span className="text-sm text-charcoal-600">
                      Total: {stockBySizeOnly.find(s => s.size === size)?.totalStock || 0}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {colors.map(color => {
                      const variant = stockByVariant.find(v => v.size === size && v.color === color);
                      const stock = variant?.stock || 0;
                      const isOutOfStock = stock === 0;
                      const isLowStock = stock > 0 && stock <= 3;
                      const key = getVariantKey(size, color);
                      const pendingCount = pendingNotifications[key] || 0;
                      
                      return (
                        <div 
                          key={color}
                          className={`
                            relative p-3 rounded-lg border-2 transition-all
                            ${isOutOfStock 
                              ? 'border-red-200 bg-red-50' 
                              : isLowStock 
                                ? 'border-amber-200 bg-amber-50' 
                                : 'border-charcoal-200 bg-white'
                            }
                          `}
                        >
                          <div className="text-center mb-2">
                            <span className="text-sm font-medium text-charcoal-700">{color}</span>
                          </div>
                          
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => incrementStock(size, color, -1)}
                              disabled={stock <= 0}
                              className="w-7 h-7 flex items-center justify-center rounded bg-charcoal-100 hover:bg-charcoal-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              -
                            </button>
                            
                            <input
                              type="number"
                              value={stock}
                              onChange={(e) => handleStockChange(size, color, e.target.value)}
                              min="0"
                              className={`
                                w-14 h-8 text-center text-sm font-bold rounded border
                                focus:outline-none focus:ring-2
                                ${isOutOfStock 
                                  ? 'border-red-300 text-red-700 focus:ring-red-300' 
                                  : isLowStock 
                                    ? 'border-amber-300 text-amber-700 focus:ring-amber-300' 
                                    : 'border-charcoal-300 text-charcoal-800 focus:ring-navy-300'
                                }
                              `}
                            />
                            
                            <button
                              type="button"
                              onClick={() => incrementStock(size, color, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded bg-charcoal-100 hover:bg-charcoal-200 text-sm"
                            >
                              +
                            </button>
                          </div>
                          
                          {pendingCount > 0 && (
                            <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full" title={`${pendingCount} esperando`}>
                              {pendingCount}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Vista simple para solo tallas o solo colores
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stockByVariant.map(({ size, color, stock }) => {
              const isOutOfStock = stock === 0;
              const isLowStock = stock > 0 && stock <= 3;
              const label = size || color || 'Default';
              const key = getVariantKey(size, color);
              const pendingCount = pendingNotifications[key] || 0;
              
              return (
                <div 
                  key={key}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${isOutOfStock 
                      ? 'border-red-200 bg-red-50' 
                      : isLowStock 
                        ? 'border-amber-200 bg-amber-50' 
                        : 'border-charcoal-200 bg-white hover:border-navy-300'
                    }
                  `}
                >
                  <div className="text-center mb-3">
                    <span className={`
                      inline-block px-3 py-1 text-sm font-bold rounded-full
                      ${isOutOfStock 
                        ? 'bg-red-200 text-red-800' 
                        : isLowStock 
                          ? 'bg-amber-200 text-amber-800' 
                          : 'bg-navy-100 text-navy-800'
                      }
                    `}>
                      {label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => incrementStock(size, color, -1)}
                      disabled={stock <= 0}
                      className="w-8 h-8 flex items-center justify-center rounded bg-charcoal-100 hover:bg-charcoal-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => handleStockChange(size, color, e.target.value)}
                      min="0"
                      className={`
                        w-16 h-10 text-center text-lg font-bold rounded border
                        focus:outline-none focus:ring-2
                        ${isOutOfStock 
                          ? 'border-red-300 text-red-700 focus:ring-red-300' 
                          : isLowStock 
                            ? 'border-amber-300 text-amber-700 focus:ring-amber-300' 
                            : 'border-charcoal-300 text-charcoal-800 focus:ring-navy-300'
                        }
                      `}
                    />
                    
                    <button
                      type="button"
                      onClick={() => incrementStock(size, color, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded bg-charcoal-100 hover:bg-charcoal-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex justify-center gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => incrementStock(size, color, 5)}
                      className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => incrementStock(size, color, 10)}
                      className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      +10
                    </button>
                  </div>
                  
                  {pendingCount > 0 && (
                    <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full" title={`${pendingCount} clientes esperando`}>
                      {pendingCount}
                    </div>
                  )}
                  
                  <div className="text-center mt-2">
                    <span className={`text-xs ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-charcoal-500'}`}>
                      {isOutOfStock ? 'Sin stock' : isLowStock ? 'Stock bajo' : 'Disponible'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-white border-t border-charcoal-200 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-charcoal-600">
            <span className="font-medium text-amber-600">Cambios sin guardar</span>
            {' • '}
            Stock total: <span className="font-bold">{totalStock}</span> unidades
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetChanges}
              className="px-4 py-2 text-sm text-charcoal-600 hover:text-charcoal-800 transition-colors"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={saveAllStock}
              disabled={saving}
              className="px-6 py-2 bg-navy-900 text-white font-medium rounded-lg hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`
          fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up
          ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}
        `}>
          {toast.type === 'success' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
