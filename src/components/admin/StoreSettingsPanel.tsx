/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Store Settings Panel (Envíos, Pagos, etc.)
 * Panel de configuración de la tienda moderno
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';

export default function StoreSettingsPanel() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Configuración de envíos
  const [shipping, setShipping] = useState({
    freeShippingMin: 100,
    standardCost: 4.99,
    expressCost: 9.99,
    expressEnabled: true,
    returnDays: 30,
  });

  // Configuración de pagos
  const [payments, setPayments] = useState({
    stripeEnabled: true,
    paypalEnabled: false,
    transferEnabled: true,
    currency: 'EUR',
  });

  // Configuración de impuestos
  const [taxes, setTaxes] = useState({
    vatRate: 21,
    pricesIncludeVat: true,
    showVatBreakdown: true,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Configuración de Envíos */}
      <section className="bg-white border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Envíos</h2>
              <p className="text-sm text-gray-500">Configura los costes y opciones de envío</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Envío gratis a partir de (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.freeShippingMin}
                  onChange={(e) => setShipping({ ...shipping, freeShippingMin: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coste envío estándar
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.standardCost}
                  onChange={(e) => setShipping({ ...shipping, standardCost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días para devoluciones
              </label>
              <input
                type="number"
                min="0"
                value={shipping.returnDays}
                onChange={(e) => setShipping({ ...shipping, returnDays: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="font-medium text-gray-900">Envío Express (24-48h)</span>
                <p className="text-sm text-gray-500">Coste: {shipping.expressCost}€</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shipping.expressEnabled}
                onChange={(e) => setShipping({ ...shipping, expressEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Configuración de Pagos */}
      <section className="bg-white border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Métodos de Pago</h2>
              <p className="text-sm text-gray-500">Activa los métodos de pago disponibles</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stripe */}
            <label className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              payments.stripeEnabled 
                ? 'border-indigo-500 bg-indigo-50/50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={payments.stripeEnabled}
                onChange={(e) => setPayments({ ...payments, stripeEnabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                payments.stripeEnabled ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <span className={`text-2xl font-bold ${payments.stripeEnabled ? 'text-indigo-600' : 'text-gray-400'}`}>S</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">Stripe</span>
                <span className="text-sm text-gray-500">Tarjetas de crédito</span>
              </div>
              {payments.stripeEnabled && (
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>

            {/* PayPal */}
            <label className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              payments.paypalEnabled 
                ? 'border-blue-500 bg-blue-50/50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={payments.paypalEnabled}
                onChange={(e) => setPayments({ ...payments, paypalEnabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                payments.paypalEnabled ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <span className={`text-2xl font-bold ${payments.paypalEnabled ? 'text-blue-600' : 'text-gray-400'}`}>P</span>
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">PayPal</span>
                <span className="text-sm text-gray-500">Cuenta PayPal</span>
              </div>
              {payments.paypalEnabled && (
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>

            {/* Transferencia */}
            <label className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              payments.transferEnabled 
                ? 'border-gray-700 bg-gray-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={payments.transferEnabled}
                onChange={(e) => setPayments({ ...payments, transferEnabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                payments.transferEnabled ? 'bg-gray-200' : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${payments.transferEnabled ? 'text-gray-700' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">Transferencia</span>
                <span className="text-sm text-gray-500">Pago manual</span>
              </div>
              {payments.transferEnabled && (
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          </div>

          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moneda
            </label>
            <select
              value={payments.currency}
              onChange={(e) => setPayments({ ...payments, currency: e.target.value })}
              className="w-full md:w-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none appearance-none"
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dólar ($)</option>
              <option value="GBP">Libra (£)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Configuración de Impuestos */}
      <section className="bg-white border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Impuestos</h2>
              <p className="text-sm text-gray-500">Configura el IVA y otros impuestos</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de IVA (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={taxes.vatRate}
                onChange={(e) => setTaxes({ ...taxes, vatRate: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">IVA general en España: 21%</p>
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <span className="font-medium text-gray-900">Los precios incluyen IVA</span>
                <p className="text-sm text-gray-500">Los precios mostrados ya incluyen impuestos</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxes.pricesIncludeVat}
                  onChange={(e) => setTaxes({ ...taxes, pricesIncludeVat: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <span className="font-medium text-gray-900">Mostrar desglose de IVA</span>
                <p className="text-sm text-gray-500">Mostrar el IVA desglosado en el carrito</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxes.showVatBreakdown}
                  onChange={(e) => setTaxes({ ...taxes, showVatBreakdown: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </label>
          </div>
        </div>
      </section>

      {/* Botón Guardar */}
      <div className="flex items-center justify-between py-4">
        <div>
          {saved && (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cambios guardados correctamente
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
