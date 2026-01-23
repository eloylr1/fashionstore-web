/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Settings Tabs Component (React)
 * Componente de configuración con pestañas profesional
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';

interface Tab {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: 'store',
    name: 'Tienda',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'shipping',
    name: 'Envíos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'payments',
    name: 'Pagos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'taxes',
    name: 'Impuestos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    name: 'Notificaciones',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: 'legal',
    name: 'Legal',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'appearance',
    name: 'Aspecto',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
];

export default function SettingsTabs() {
  const [activeTab, setActiveTab] = useState('store');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Estados para cada sección
  const [storeSettings, setStoreSettings] = useState({
    name: 'FashionMarket',
    logo: '',
    email: 'eloylopezruiz2005@gmail.com',
    phone: '+34 XXX XXX XXX',
    address: '',
    description: 'Moda masculina de alta calidad',
    instagram: '',
    facebook: '',
    twitter: '',
  });

  const [shippingSettings, setShippingSettings] = useState({
    freeShippingThreshold: 100,
    standardShippingCost: 4.99,
    returnDays: 30,
    shippingZones: 'España peninsular',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    stripeEnabled: true,
    paypalEnabled: false,
    transferEnabled: true,
    currency: 'EUR',
    stripePublicKey: '',
  });

  const [taxSettings, setTaxSettings] = useState({
    taxRate: 21,
    pricesIncludeTax: true,
    taxId: '',
    businessName: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    orderEmail: 'eloylopezruiz2005@gmail.com',
    lowStockEmail: 'eloylopezruiz2005@gmail.com',
    lowStockThreshold: 5,
    newCustomerAlert: true,
    orderStatusAlert: true,
  });

  const [legalSettings, setLegalSettings] = useState({
    termsAndConditions: '',
    privacyPolicy: '',
    returnPolicy: '',
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    primaryColor: '#1e3a5f',
    secondaryColor: '#8b5a2b',
    accentColor: '#d4a574',
    fontFamily: 'Inter',
    darkMode: false,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simular guardado
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'store':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la tienda
                </label>
                <input
                  type="text"
                  value={storeSettings.name}
                  onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de contacto
                </label>
                <input
                  type="email"
                  value={storeSettings.email}
                  onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo de la tienda
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  {storeSettings.logo ? (
                    <img src={storeSettings.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                  Subir imagen
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={storeSettings.phone}
                  onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={storeSettings.address}
                  onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción de la tienda
              </label>
              <textarea
                rows={3}
                value={storeSettings.description}
                onChange={(e) => setStoreSettings({ ...storeSettings, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Redes Sociales</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={storeSettings.instagram}
                      onChange={(e) => setStoreSettings({ ...storeSettings, instagram: e.target.value })}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="username"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={storeSettings.facebook}
                    onChange={(e) => setStoreSettings({ ...storeSettings, facebook: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="URL o username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter/X
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={storeSettings.twitter}
                      onChange={(e) => setStoreSettings({ ...storeSettings, twitter: e.target.value })}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'shipping':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Envío gratis a partir de (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingSettings.freeShippingThreshold}
                  onChange={(e) => setShippingSettings({ ...shippingSettings, freeShippingThreshold: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Establece 0 para desactivar envío gratis</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coste de envío estándar (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingSettings.standardShippingCost}
                  onChange={(e) => setShippingSettings({ ...shippingSettings, standardShippingCost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días para devoluciones
                </label>
                <input
                  type="number"
                  min="0"
                  value={shippingSettings.returnDays}
                  onChange={(e) => setShippingSettings({ ...shippingSettings, returnDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zonas de envío
                </label>
                <select
                  value={shippingSettings.shippingZones}
                  onChange={(e) => setShippingSettings({ ...shippingSettings, shippingZones: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                >
                  <option value="España peninsular">España peninsular</option>
                  <option value="España + Islas">España + Baleares/Canarias</option>
                  <option value="Europa">Europa</option>
                  <option value="Internacional">Internacional</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Configuración de envíos</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Los costes de envío se aplicarán automáticamente en el checkout según estas configuraciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Métodos de pago activos
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={paymentSettings.stripeEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, stripeEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Stripe</span>
                    <p className="text-sm text-gray-500">Tarjetas de crédito/débito</p>
                  </div>
                  <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={paymentSettings.paypalEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, paypalEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">PayPal</span>
                    <p className="text-sm text-gray-500">Cuenta PayPal o tarjeta</p>
                  </div>
                  <svg className="w-8 h-8 text-blue-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19a.563.563 0 0 0-.556.479l-1.614 8.527zm6.072-15.582h-.282a.282.282 0 0 0-.278.238l-.562 3.564a.282.282 0 0 0 .278.326h.319c1.306 0 2.555-.262 3.207-1.324.277-.45.433-.996.511-1.682.158-1.417-.67-1.122-3.193-1.122z"/>
                  </svg>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={paymentSettings.transferEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, transferEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Transferencia bancaria</span>
                    <p className="text-sm text-gray-500">Pago manual por transferencia</p>
                  </div>
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  value={paymentSettings.currency}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, currency: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dólar ($)</option>
                  <option value="GBP">Libra (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stripe Public Key
                </label>
                <input
                  type="text"
                  value={paymentSettings.stripePublicKey}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, stripePublicKey: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono text-sm"
                  placeholder="pk_live_..."
                />
              </div>
            </div>
          </div>
        );

      case 'taxes':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IVA (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxSettings.taxRate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, taxRate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxSettings.pricesIncludeTax}
                    onChange={(e) => setTaxSettings({ ...taxSettings, pricesIncludeTax: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Los precios incluyen IVA</span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Datos fiscales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIF/CIF
                  </label>
                  <input
                    type="text"
                    value={taxSettings.taxId}
                    onChange={(e) => setTaxSettings({ ...taxSettings, taxId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="B12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón social
                  </label>
                  <input
                    type="text"
                    value={taxSettings.businessName}
                    onChange={(e) => setTaxSettings({ ...taxSettings, businessName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    placeholder="Nombre de la empresa"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email para pedidos nuevos
                </label>
                <input
                  type="email"
                  value={notificationSettings.orderEmail}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, orderEmail: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email para alertas de stock
                </label>
                <input
                  type="email"
                  value={notificationSettings.lowStockEmail}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, lowStockEmail: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Umbral de stock bajo
              </label>
              <input
                type="number"
                min="1"
                value={notificationSettings.lowStockThreshold}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, lowStockThreshold: parseInt(e.target.value) })}
                className="w-full max-w-xs px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Recibirás alerta cuando el stock baje de este número</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Alertas activas</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.newCustomerAlert}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, newCustomerAlert: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Notificar nuevos registros de clientes</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.orderStatusAlert}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, orderStatusAlert: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Notificar cambios de estado en pedidos</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Términos y condiciones
              </label>
              <textarea
                rows={6}
                value={legalSettings.termsAndConditions}
                onChange={(e) => setLegalSettings({ ...legalSettings, termsAndConditions: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none font-mono text-sm"
                placeholder="Escribe aquí los términos y condiciones de tu tienda..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Política de privacidad
              </label>
              <textarea
                rows={6}
                value={legalSettings.privacyPolicy}
                onChange={(e) => setLegalSettings({ ...legalSettings, privacyPolicy: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none font-mono text-sm"
                placeholder="Escribe aquí la política de privacidad..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Política de devoluciones
              </label>
              <textarea
                rows={6}
                value={legalSettings.returnPolicy}
                onChange={(e) => setLegalSettings({ ...legalSettings, returnPolicy: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none font-mono text-sm"
                placeholder="Escribe aquí la política de devoluciones..."
              />
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color primario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={appearanceSettings.primaryColor}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, primaryColor: e.target.value })}
                    className="w-12 h-10 border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={appearanceSettings.primaryColor}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, primaryColor: e.target.value })}
                    className="flex-1 px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color secundario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={appearanceSettings.secondaryColor}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, secondaryColor: e.target.value })}
                    className="w-12 h-10 border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={appearanceSettings.secondaryColor}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, secondaryColor: e.target.value })}
                    className="flex-1 px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color acento
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={appearanceSettings.accentColor}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, accentColor: e.target.value })}
                    className="w-12 h-10 border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={appearanceSettings.accentColor}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, accentColor: e.target.value })}
                    className="flex-1 px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipografía
                </label>
                <select
                  value={appearanceSettings.fontFamily}
                  onChange={(e) => setAppearanceSettings({ ...appearanceSettings, fontFamily: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none bg-white"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appearanceSettings.darkMode}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, darkMode: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Habilitar modo oscuro</span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Vista previa</h4>
              <div
                className="p-6 border border-gray-200"
                style={{ fontFamily: appearanceSettings.fontFamily }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12"
                    style={{ backgroundColor: appearanceSettings.primaryColor }}
                  />
                  <div
                    className="w-12 h-12"
                    style={{ backgroundColor: appearanceSettings.secondaryColor }}
                  />
                  <div
                    className="w-12 h-12"
                    style={{ backgroundColor: appearanceSettings.accentColor }}
                  />
                </div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{ color: appearanceSettings.primaryColor }}
                >
                  Título de ejemplo
                </h3>
                <p className="text-gray-600">
                  Este es un texto de ejemplo con la tipografía {appearanceSettings.fontFamily}.
                </p>
                <button
                  className="mt-4 px-4 py-2 text-white font-medium"
                  style={{ backgroundColor: appearanceSettings.primaryColor }}
                >
                  Botón de ejemplo
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar de pestañas */}
      <div className="lg:w-64 flex-shrink-0">
        <nav className="bg-white border border-gray-200 overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
                activeTab === tab.id
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}>
                {tab.icon}
              </span>
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="flex-1">
        <div className="bg-white border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {tabs.find((t) => t.id === activeTab)?.name}
            </h2>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardado
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-6">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
}
