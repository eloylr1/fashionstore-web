-- Migration: Crear tabla para métodos de envío dinámicos
-- Fecha: 2026-01-29

-- Crear tabla de métodos de envío
CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL DEFAULT 0, -- en céntimos
  estimated_days INTEGER NOT NULL DEFAULT 3,
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- método por defecto
  icon TEXT DEFAULT 'standard', -- standard, express, same_day, pickup
  sort_order INTEGER DEFAULT 0,
  -- Condiciones de aplicación
  min_order_amount INTEGER, -- mínimo de pedido para este método (céntimos)
  max_order_amount INTEGER, -- máximo de pedido para este método (céntimos)
  free_above INTEGER, -- gratis a partir de este importe (céntimos)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar métodos de envío por defecto
INSERT INTO shipping_methods (name, description, cost, estimated_days, is_enabled, is_default, icon, sort_order) VALUES
  ('Envío Estándar', 'Entrega en 3-5 días laborables', 499, 3, true, true, 'standard', 1),
  ('Envío Express', 'Entrega en 24-48 horas', 999, 1, true, false, 'express', 2)
ON CONFLICT DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_shipping_methods_enabled ON shipping_methods(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_shipping_methods_sort ON shipping_methods(sort_order);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_shipping_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipping_methods_updated_at ON shipping_methods;
CREATE TRIGGER trigger_shipping_methods_updated_at
  BEFORE UPDATE ON shipping_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_shipping_methods_updated_at();

-- Asegurar que solo un método sea default
CREATE OR REPLACE FUNCTION ensure_single_default_shipping()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE shipping_methods SET is_default = false WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_default_shipping ON shipping_methods;
CREATE TRIGGER trigger_single_default_shipping
  BEFORE INSERT OR UPDATE OF is_default ON shipping_methods
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_shipping();

-- RLS policies
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer métodos de envío
CREATE POLICY "Anyone can read shipping methods" ON shipping_methods
  FOR SELECT USING (true);

-- Solo admins pueden modificar (usando service role)
CREATE POLICY "Service role can manage shipping methods" ON shipping_methods
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE shipping_methods IS 'Métodos de envío configurables para la tienda';
COMMENT ON COLUMN shipping_methods.cost IS 'Coste en céntimos (499 = 4.99€)';
COMMENT ON COLUMN shipping_methods.free_above IS 'Gratis para pedidos superiores a este importe (en céntimos)';
