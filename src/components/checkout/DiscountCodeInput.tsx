/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Discount Code Input Component
 * Campo para aplicar códigos de descuento en checkout
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';

interface DiscountCodeInputProps {
  subtotal: number; // En céntimos
  onApply: (discount: DiscountResult | null) => void;
}

export interface DiscountResult {
  discount_code_id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  discount_amount: number;
  total_after_discount: number;
}

export default function DiscountCodeInput({ subtotal, onApply }: DiscountCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountResult | null>(null);

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Introduce un código');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          subtotal,
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        setError(data.reason || 'Código no válido');
        setAppliedDiscount(null);
        onApply(null);
        return;
      }

      setAppliedDiscount(data);
      onApply(data);
      setError('');
    } catch (err) {
      setError('Error al validar. Inténtalo de nuevo.');
      setAppliedDiscount(null);
      onApply(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setAppliedDiscount(null);
    setError('');
    onApply(null);
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-navy-900">
        Código de descuento
      </label>

      {!appliedDiscount ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="Ej: WELCOME10"
            className="flex-1 px-4 py-2.5 border border-charcoal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-matte focus:border-transparent uppercase"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="px-4 py-2.5 bg-navy-900 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Aplicar'
            )}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-800">
                  {appliedDiscount.code}
                </p>
                <p className="text-sm text-green-600">
                  {appliedDiscount.type === 'percentage' 
                    ? `${appliedDiscount.value}% de descuento`
                    : `${formatPrice(appliedDiscount.value)} de descuento`
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 text-green-700 hover:text-green-900 hover:bg-green-100 rounded-lg transition-colors"
              aria-label="Eliminar código"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200 flex justify-between text-sm">
            <span className="text-green-700">Ahorro:</span>
            <span className="font-semibold text-green-800">
              -{formatPrice(appliedDiscount.discount_amount)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
