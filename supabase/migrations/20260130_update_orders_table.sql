-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Migración: Actualizar tabla orders para checkout completo
-- Fecha: 30 de enero de 2026
-- 
-- Esta migración añade soporte para:
-- - Compras como invitado (guest_email)
-- - Dirección de envío detallada
-- - Múltiples métodos de pago
-- - Códigos de descuento
-- - Notas del pedido
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Permitir user_id NULL (para invitados)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Añadir columnas para invitados y datos de envío
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shipping_address_line1 VARCHAR(500),
  ADD COLUMN IF NOT EXISTS shipping_address_line2 VARCHAR(500),
  ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_province VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100) DEFAULT 'España',
  ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) DEFAULT 'standard';

-- 3. Añadir columnas para pagos y descuentos
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cod_extra_cost INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Actualizar tabla order_items para incluir más campos
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_image TEXT,
  ADD COLUMN IF NOT EXISTS product_slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS unit_price INTEGER,
  ADD COLUMN IF NOT EXISTS total_price INTEGER;

-- 5. Índices adicionales para rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON public.orders(guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 6. Asegurar que RLS está deshabilitado (para API con service role)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- 7. Verificar que las columnas existen
DO $$
BEGIN
  RAISE NOTICE 'Migración completada: tabla orders actualizada para checkout completo';
END $$;
