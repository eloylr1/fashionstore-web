-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Esquema Extendido de Base de Datos
-- Tablas adicionales para: Direcciones, Métodos de Pago, Pedidos, Devoluciones
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: order_status
-- Estados posibles de un pedido
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',        -- Pendiente de pago
    'paid',           -- Pagado
    'processing',     -- En preparación
    'shipped',        -- Enviado
    'delivered',      -- Entregado
    'cancelled',      -- Cancelado
    'refunded'        -- Reembolsado
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: return_status
-- Estados posibles de una devolución
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE return_status AS ENUM (
    'requested',      -- Solicitada
    'approved',       -- Aprobada
    'in_transit',     -- En tránsito
    'received',       -- Recibida
    'refunded',       -- Reembolsada
    'rejected'        -- Rechazada
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: addresses
-- Direcciones de envío de los usuarios
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Casa', -- Casa, Trabajo, Otro
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'España',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: payment_methods
-- Métodos de pago guardados (tokenizados - NO guardamos datos sensibles)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- card, paypal, bizum
  label VARCHAR(50), -- "Visa terminada en 4242"
  last_four VARCHAR(4), -- Últimos 4 dígitos
  brand VARCHAR(20), -- visa, mastercard, amex
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  stripe_payment_method_id VARCHAR(255), -- ID de Stripe (si usas Stripe)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: orders
-- Pedidos de la tienda
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) NOT NULL UNIQUE, -- FM-2024-001234
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status order_status DEFAULT 'pending',
  
  -- Dirección de envío (copiada, no referenciada)
  shipping_name VARCHAR(255) NOT NULL,
  shipping_phone VARCHAR(20) NOT NULL,
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_province VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(100) DEFAULT 'España',
  
  -- Totales en CÉNTIMOS
  subtotal INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  
  -- Info adicional
  payment_method VARCHAR(50),
  tracking_number VARCHAR(100),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: order_items
-- Items de cada pedido
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Info del producto (copiada para histórico)
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  product_slug VARCHAR(255),
  
  quantity INTEGER NOT NULL DEFAULT 1,
  size VARCHAR(20),
  color VARCHAR(50),
  unit_price INTEGER NOT NULL, -- Precio en céntimos
  total_price INTEGER NOT NULL, -- quantity * unit_price
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: returns
-- Devoluciones de pedidos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number VARCHAR(20) NOT NULL UNIQUE, -- RET-2024-001234
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status return_status DEFAULT 'requested',
  
  reason VARCHAR(100) NOT NULL, -- 'wrong_size', 'defective', 'not_as_described', 'changed_mind'
  description TEXT,
  
  refund_amount INTEGER, -- Cantidad a reembolsar en céntimos
  refund_method VARCHAR(50), -- 'original', 'store_credit'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_returns_user ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON public.returns(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: return_items
-- Items de cada devolución
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON public.return_items(return_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: wishlist
-- Lista de deseos de los usuarios
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS: Auto-update updated_at
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_addresses_updated_at ON public.addresses;
CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER set_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_returns_updated_at ON public.returns;
CREATE TRIGGER set_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Generar número de pedido
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.orders
  WHERE order_number LIKE 'FM-' || year_part || '-%';
  
  NEW.order_number := 'FM-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Generar número de devolución
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.returns
  WHERE return_number LIKE 'RET-' || year_part || '-%';
  
  NEW.return_number := 'RET-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_return_number ON public.returns;
CREATE TRIGGER set_return_number
  BEFORE INSERT ON public.returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL)
  EXECUTE FUNCTION generate_return_number();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- ─── Políticas para ADDRESSES ───

CREATE POLICY "Usuarios pueden ver sus direcciones"
  ON public.addresses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden crear direcciones"
  ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar sus direcciones"
  ON public.addresses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden eliminar sus direcciones"
  ON public.addresses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Políticas para PAYMENT_METHODS ───

CREATE POLICY "Usuarios pueden ver sus métodos de pago"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden crear métodos de pago"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar sus métodos de pago"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden eliminar sus métodos de pago"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Políticas para ORDERS ───

CREATE POLICY "Usuarios pueden ver sus pedidos"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins pueden ver todos los pedidos"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuarios pueden crear pedidos"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins pueden actualizar pedidos"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Políticas para ORDER_ITEMS ───

CREATE POLICY "Usuarios pueden ver items de sus pedidos"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden crear items de pedidos"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- ─── Políticas para RETURNS ───

CREATE POLICY "Usuarios pueden ver sus devoluciones"
  ON public.returns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden crear devoluciones"
  ON public.returns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins pueden actualizar devoluciones"
  ON public.returns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Políticas para RETURN_ITEMS ───

CREATE POLICY "Usuarios pueden ver items de sus devoluciones"
  ON public.return_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.returns
      WHERE returns.id = return_items.return_id
      AND returns.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden crear items de devoluciones"
  ON public.return_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.returns
      WHERE returns.id = return_items.return_id
      AND returns.user_id = auth.uid()
    )
  );

-- ─── Políticas para WISHLIST ───

CREATE POLICY "Usuarios pueden ver su wishlist"
  ON public.wishlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden añadir a wishlist"
  ON public.wishlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios pueden eliminar de wishlist"
  ON public.wishlist FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
