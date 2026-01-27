-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Store Settings Schema
-- Tabla para almacenar configuraciones de la tienda
-- ═══════════════════════════════════════════════════════════════════════════

-- Crear tabla store_settings si no existe
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL UNIQUE, -- 'shipping', 'payments', 'taxes', 'general'
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda por categoría
CREATE INDEX IF NOT EXISTS idx_store_settings_category ON public.store_settings(category);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER set_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar configuraciones por defecto
INSERT INTO public.store_settings (category, settings) VALUES
  ('shipping', '{
    "free_shipping_threshold": 10000,
    "standard_shipping_cost": 499,
    "express_shipping_cost": 999,
    "express_shipping_enabled": true,
    "return_days": 30,
    "estimated_delivery_days": 3,
    "express_delivery_days": 1
  }'::jsonb),
  ('payments', '{
    "stripe_enabled": true,
    "paypal_enabled": false,
    "transfer_enabled": true,
    "cash_on_delivery_enabled": false,
    "currency": "EUR",
    "currency_symbol": "€"
  }'::jsonb),
  ('taxes', '{
    "tax_enabled": true,
    "tax_rate": 21,
    "tax_name": "IVA",
    "prices_include_tax": true,
    "tax_number": "",
    "show_tax_on_checkout": true
  }'::jsonb),
  ('general', '{
    "store_name": "FashionMarket",
    "store_email": "",
    "store_phone": "",
    "store_address": "",
    "store_city": "",
    "store_postal_code": "",
    "store_country": "España"
  }'::jsonb)
ON CONFLICT (category) DO NOTHING;

-- Permisos RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Política para lectura (todos pueden leer)
DROP POLICY IF EXISTS "Anyone can read store settings" ON public.store_settings;
CREATE POLICY "Anyone can read store settings" ON public.store_settings
  FOR SELECT USING (true);

-- Política para escritura (solo admins a través de service role)
DROP POLICY IF EXISTS "Service role can manage store settings" ON public.store_settings;
CREATE POLICY "Service role can manage store settings" ON public.store_settings
  FOR ALL USING (true);
