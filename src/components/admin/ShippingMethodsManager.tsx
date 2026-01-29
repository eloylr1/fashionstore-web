/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Shipping Methods Manager
 * Componente para gestionar métodos de envío dinámicos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  cost: number; // en céntimos
  estimated_days: number;
  is_enabled: boolean;
  is_default: boolean;
  icon: string;
  sort_order: number;
  free_above: number | null;
}

const ICONS = {
  standard: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  express: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  same_day: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pickup: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

const ICON_COLORS = {
  standard: 'bg-navy-100 text-navy-600',
  express: 'bg-amber-100 text-amber-600',
  same_day: 'bg-green-100 text-green-600',
  pickup: 'bg-purple-100 text-purple-600',
};

export default function ShippingMethodsManager() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: '',
    estimated_days: '3',
    icon: 'standard',
    free_above: '',
    is_enabled: true,
  });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const res = await fetch('/api/admin/shipping-methods');
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } catch (error) {
      console.error('Error loading methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        cost: Math.round(parseFloat(formData.cost || '0') * 100),
        estimated_days: parseInt(formData.estimated_days),
        icon: formData.icon,
        free_above: formData.free_above ? Math.round(parseFloat(formData.free_above) * 100) : null,
        is_enabled: formData.is_enabled,
      };

      const url = editingId 
        ? `/api/admin/shipping-methods?id=${editingId}`
        : '/api/admin/shipping-methods';
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingId ? 'Método actualizado' : 'Método creado');
        loadMethods();
        resetForm();
      } else {
        const error = await res.json();
        showToast(error.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este método de envío?')) return;

    try {
      const res = await fetch(`/api/admin/shipping-methods?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Método eliminado');
        loadMethods();
      } else {
        showToast('Error al eliminar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    }
  };

  const handleToggleEnabled = async (method: ShippingMethod) => {
    try {
      const res = await fetch(`/api/admin/shipping-methods?id=${method.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !method.is_enabled }),
      });

      if (res.ok) {
        loadMethods();
      }
    } catch (error) {
      console.error('Error toggling method:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shipping-methods?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (res.ok) {
        showToast('Método establecido como predeterminado');
        loadMethods();
      }
    } catch (error) {
      showToast('Error', 'error');
    }
  };

  const startEdit = (method: ShippingMethod) => {
    setEditingId(method.id);
    setFormData({
      name: method.name,
      description: method.description || '',
      cost: (method.cost / 100).toFixed(2),
      estimated_days: method.estimated_days.toString(),
      icon: method.icon,
      free_above: method.free_above ? (method.free_above / 100).toFixed(2) : '',
      is_enabled: method.is_enabled,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      description: '',
      cost: '',
      estimated_days: '3',
      icon: 'standard',
      free_above: '',
      is_enabled: true,
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Métodos de Envío</h1>
          <p className="text-charcoal-500 mt-1">Configura los tipos de envío disponibles para tus clientes</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-navy-900 text-white font-medium hover:bg-navy-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir Método
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-charcoal-100 p-6">
          <h2 className="font-semibold text-navy-900 mb-4">
            {editingId ? 'Editar Método de Envío' : 'Nuevo Método de Envío'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-elegant"
                  placeholder="Ej: Envío Premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Icono</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="input-elegant"
                >
                  <option value="standard">📦 Estándar</option>
                  <option value="express">⚡ Express</option>
                  <option value="same_day">🕐 Mismo día</option>
                  <option value="pickup">🏢 Recogida</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">Descripción</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-elegant"
                placeholder="Ej: Entrega en 24-48 horas"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Coste (€) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="input-elegant"
                  placeholder="4.99"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Días de entrega *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="30"
                  value={formData.estimated_days}
                  onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                  className="input-elegant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Gratis a partir de (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.free_above}
                  onChange={(e) => setFormData({ ...formData, free_above: e.target.value })}
                  className="input-elegant"
                  placeholder="100.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="w-4 h-4 text-navy-600 rounded"
              />
              <label htmlFor="is_enabled" className="text-sm text-charcoal-700">
                Método activo (visible para clientes)
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-navy-900 text-white font-medium hover:bg-navy-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear Método')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Methods List */}
      <div className="space-y-4">
        {methods.length === 0 ? (
          <div className="bg-white border border-charcoal-100 p-8 text-center">
            <p className="text-charcoal-500">No hay métodos de envío configurados</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-navy-600 hover:text-navy-800 font-medium"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          methods.map((method) => (
            <div
              key={method.id}
              className={`bg-white border ${method.is_enabled ? 'border-charcoal-100' : 'border-charcoal-200 bg-charcoal-50'} p-6 transition-all`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${ICON_COLORS[method.icon as keyof typeof ICON_COLORS] || ICON_COLORS.standard}`}>
                  {ICONS[method.icon as keyof typeof ICONS] || ICONS.standard}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className={`font-semibold ${method.is_enabled ? 'text-navy-900' : 'text-charcoal-400'}`}>
                      {method.name}
                    </h2>
                    {method.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Predeterminado
                      </span>
                    )}
                    {!method.is_enabled && (
                      <span className="text-xs bg-charcoal-200 text-charcoal-600 px-2 py-0.5 rounded">
                        Desactivado
                      </span>
                    )}
                  </div>
                  {method.description && (
                    <p className={`text-sm mt-1 ${method.is_enabled ? 'text-charcoal-500' : 'text-charcoal-400'}`}>
                      {method.description}
                    </p>
                  )}
                  <div className="flex items-center gap-6 mt-3 text-sm">
                    <span className={method.is_enabled ? 'text-charcoal-700' : 'text-charcoal-400'}>
                      <strong>{(method.cost / 100).toFixed(2)}€</strong>
                    </span>
                    <span className={method.is_enabled ? 'text-charcoal-500' : 'text-charcoal-400'}>
                      {method.estimated_days} {method.estimated_days === 1 ? 'día' : 'días'}
                    </span>
                    {method.free_above && (
                      <span className="text-green-600">
                        Gratis +{(method.free_above / 100).toFixed(0)}€
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!method.is_default && method.is_enabled && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="p-2 text-charcoal-400 hover:text-green-600 transition-colors"
                      title="Establecer como predeterminado"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleEnabled(method)}
                    className={`p-2 transition-colors ${method.is_enabled ? 'text-charcoal-400 hover:text-amber-600' : 'text-charcoal-400 hover:text-green-600'}`}
                    title={method.is_enabled ? 'Desactivar' : 'Activar'}
                  >
                    {method.is_enabled ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(method)}
                    className="p-2 text-charcoal-400 hover:text-navy-600 transition-colors"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {!method.is_default && (
                    <button
                      onClick={() => handleDelete(method.id)}
                      className="p-2 text-charcoal-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
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
