-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Stock por Talla
-- Implementa sistema de stock independiente por cada talla de producto
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: product_size_stock
-- Stock independiente para cada talla de cada producto
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_size_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_product_size_stock_product ON public.product_size_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_size_stock_low ON public.product_size_stock(stock) WHERE stock < 5;

-- Trigger para auto-update updated_at
DROP TRIGGER IF EXISTS set_product_size_stock_updated_at ON public.product_size_stock;
CREATE TRIGGER set_product_size_stock_updated_at
  BEFORE UPDATE ON public.product_size_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: stock_notifications
-- Notificaciones de usuarios que quieren ser avisados cuando hay stock
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stock_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size, email)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_notifications_pending ON public.stock_notifications(product_id, size) WHERE notified = FALSE;
CREATE INDEX IF NOT EXISTS idx_stock_notifications_email ON public.stock_notifications(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRAR: Datos existentes de stock global a stock por talla
-- Distribuye el stock actual equitativamente entre las tallas disponibles
-- ─────────────────────────────────────────────────────────────────────────────

-- Función para migrar stock existente
DO $$
DECLARE
  p RECORD;
  size_item TEXT;
  num_sizes INT;
  stock_per_size INT;
BEGIN
  -- Iterar sobre cada producto con stock > 0 y tallas definidas
  FOR p IN 
    SELECT id, stock, sizes 
    FROM public.products 
    WHERE stock > 0 AND sizes IS NOT NULL AND array_length(sizes, 1) > 0
  LOOP
    num_sizes := array_length(p.sizes, 1);
    stock_per_size := GREATEST(1, p.stock / num_sizes);
    
    -- Crear entrada de stock para cada talla
    FOREACH size_item IN ARRAY p.sizes
    LOOP
      INSERT INTO public.product_size_stock (product_id, size, stock)
      VALUES (p.id, size_item, stock_per_size)
      ON CONFLICT (product_id, size) DO NOTHING;
    END LOOP;
  END LOOP;
  
  -- Para productos sin tallas definidas, crear una entrada genérica
  FOR p IN 
    SELECT id, stock 
    FROM public.products 
    WHERE stock > 0 AND (sizes IS NULL OR array_length(sizes, 1) IS NULL OR array_length(sizes, 1) = 0)
  LOOP
    INSERT INTO public.product_size_stock (product_id, size, stock)
    VALUES (p.id, 'UNICA', p.stock)
    ON CONFLICT (product_id, size) DO NOTHING;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: get_product_stock_by_size
-- Obtiene el stock de todas las tallas de un producto
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_product_stock_by_size(p_product_id UUID)
RETURNS TABLE(size VARCHAR, stock INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT pss.size, pss.stock
  FROM public.product_size_stock pss
  WHERE pss.product_id = p_product_id
  ORDER BY 
    CASE 
      WHEN pss.size = 'XS' THEN 1
      WHEN pss.size = 'S' THEN 2
      WHEN pss.size = 'M' THEN 3
      WHEN pss.size = 'L' THEN 4
      WHEN pss.size = 'XL' THEN 5
      WHEN pss.size = 'XXL' THEN 6
      WHEN pss.size = 'UNICA' THEN 10
      ELSE 7
    END;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: decrement_size_stock
-- Reduce el stock de una talla específica de un producto
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_size_stock(
  p_product_id UUID,
  p_size VARCHAR,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Obtener stock actual
  SELECT stock INTO current_stock
  FROM public.product_size_stock
  WHERE product_id = p_product_id AND size = p_size
  FOR UPDATE; -- Lock para evitar race conditions
  
  -- Verificar que hay suficiente stock
  IF current_stock IS NULL OR current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;
  
  -- Reducir stock
  UPDATE public.product_size_stock
  SET stock = stock - p_quantity, updated_at = NOW()
  WHERE product_id = p_product_id AND size = p_size;
  
  -- Actualizar stock total del producto (para búsquedas rápidas)
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(pss.stock), 0)
    FROM public.product_size_stock pss
    WHERE pss.product_id = p_product_id
  )
  WHERE id = p_product_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: increment_size_stock
-- Aumenta el stock de una talla específica (para cancelaciones/devoluciones)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_size_stock(
  p_product_id UUID,
  p_size VARCHAR,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Aumentar stock de la talla
  UPDATE public.product_size_stock
  SET stock = stock + p_quantity, updated_at = NOW()
  WHERE product_id = p_product_id AND size = p_size;
  
  -- Si no existe la entrada, crearla
  IF NOT FOUND THEN
    INSERT INTO public.product_size_stock (product_id, size, stock)
    VALUES (p_product_id, p_size, p_quantity);
  END IF;
  
  -- Actualizar stock total del producto
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(pss.stock), 0)
    FROM public.product_size_stock pss
    WHERE pss.product_id = p_product_id
  )
  WHERE id = p_product_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: update_size_stock
-- Actualiza el stock de una talla específica (para el admin)
-- Envía notificaciones si el stock pasa de 0 a > 0
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_size_stock(
  p_product_id UUID,
  p_size VARCHAR,
  p_new_stock INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  notifications_to_send INTEGER,
  emails TEXT[]
) AS $$
DECLARE
  old_stock INTEGER;
  notification_emails TEXT[];
  notification_count INTEGER;
BEGIN
  -- Obtener stock anterior
  SELECT stock INTO old_stock
  FROM public.product_size_stock
  WHERE product_id = p_product_id AND size = p_size;
  
  -- Insertar o actualizar stock
  INSERT INTO public.product_size_stock (product_id, size, stock)
  VALUES (p_product_id, p_size, p_new_stock)
  ON CONFLICT (product_id, size) 
  DO UPDATE SET stock = p_new_stock, updated_at = NOW();
  
  -- Actualizar stock total del producto
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(pss.stock), 0)
    FROM public.product_size_stock pss
    WHERE pss.product_id = p_product_id
  )
  WHERE id = p_product_id;
  
  -- Si el stock era 0 (o no existía) y ahora es > 0, obtener notificaciones pendientes
  notification_count := 0;
  notification_emails := ARRAY[]::TEXT[];
  
  IF (old_stock IS NULL OR old_stock = 0) AND p_new_stock > 0 THEN
    -- Obtener emails pendientes de notificación
    SELECT array_agg(email), COUNT(*)
    INTO notification_emails, notification_count
    FROM public.stock_notifications
    WHERE product_id = p_product_id 
      AND size = p_size 
      AND notified = FALSE;
    
    -- Marcar como notificados
    IF notification_count > 0 THEN
      UPDATE public.stock_notifications
      SET notified = TRUE, notified_at = NOW()
      WHERE product_id = p_product_id 
        AND size = p_size 
        AND notified = FALSE;
    END IF;
  END IF;
  
  RETURN QUERY SELECT TRUE, COALESCE(notification_count, 0), COALESCE(notification_emails, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: subscribe_stock_notification
-- Suscribe un email para recibir notificación cuando haya stock
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.subscribe_stock_notification(
  p_product_id UUID,
  p_size VARCHAR,
  p_email VARCHAR,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.stock_notifications (product_id, size, email, user_id)
  VALUES (p_product_id, p_size, p_email, p_user_id)
  ON CONFLICT (product_id, size, email) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: get_size_stock
-- Obtiene el stock de una talla específica de un producto
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_size_stock(
  p_product_id UUID,
  p_size VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT stock INTO result
  FROM public.product_size_stock
  WHERE product_id = p_product_id AND size = p_size;
  
  RETURN COALESCE(result, 0);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- ACTUALIZAR: cancel_order_and_restore_stock
-- Modificar para restaurar stock por talla
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(p_order_id UUID)
RETURNS TABLE(success BOOLEAN, message VARCHAR, order_number VARCHAR) AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_order_number VARCHAR;
  v_credit_note_number VARCHAR;
  v_year INT;
  v_count INT;
BEGIN
  -- 1) Verificar que el pedido existe y está en estado cancelable
  SELECT id, status, orders.order_number, total INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Pedido no encontrado'::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;
  
  IF v_order.status NOT IN ('pending', 'paid', 'processing', 'awaiting_payment') THEN
    RETURN QUERY SELECT FALSE, 'Solo se pueden cancelar pedidos pendientes, pagados o en proceso'::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;
  
  v_order_number := v_order.order_number;
  
  -- 2) Cambiar estado del pedido a cancelled
  UPDATE public.orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id;
  
  -- 3) Generar número de nota de crédito
  v_year := EXTRACT(YEAR FROM NOW())::INT;
  SELECT COUNT(*) INTO v_count
  FROM public.credit_notes
  WHERE credit_note_number LIKE 'NC-' || v_year || '-%';
  
  v_credit_note_number := 'NC-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 6, '0');
  
  -- 4) Crear nota de crédito
  INSERT INTO public.credit_notes (
    order_id,
    credit_note_number,
    user_id,
    total,
    reason,
    status
  )
  SELECT 
    p_order_id,
    v_credit_note_number,
    o.user_id,
    o.total,
    'Cancelación de pedido por el cliente',
    'pending'
  FROM public.orders o
  WHERE o.id = p_order_id;
  
  -- 5) Actualizar factura asociada (si existe)
  UPDATE public.invoices
  SET status = 'cancelled', updated_at = NOW()
  WHERE order_id = p_order_id;
  
  -- 6) Restaurar stock de cada item POR TALLA
  FOR v_item IN 
    SELECT product_id, quantity, size
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      -- Restaurar stock por talla
      PERFORM public.increment_size_stock(
        v_item.product_id, 
        COALESCE(v_item.size, 'UNICA'), 
        v_item.quantity
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT TRUE, 'Pedido cancelado correctamente. El stock ha sido restaurado.'::VARCHAR, v_order_number;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Políticas de seguridad
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.product_size_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Lectura pública del stock
CREATE POLICY "Stock readable by everyone" ON public.product_size_stock
  FOR SELECT USING (true);

-- Modificación solo por service role (admin)
CREATE POLICY "Stock editable by service role" ON public.product_size_stock
  FOR ALL USING (auth.role() = 'service_role');

-- Notificaciones: usuarios pueden ver/crear las suyas
CREATE POLICY "Users can view own notifications" ON public.stock_notifications
  FOR SELECT USING (email = auth.jwt()->>'email' OR user_id = auth.uid());

CREATE POLICY "Users can create notifications" ON public.stock_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Notifications editable by service role" ON public.stock_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON public.product_size_stock TO anon, authenticated;
GRANT ALL ON public.product_size_stock TO service_role;

GRANT SELECT, INSERT ON public.stock_notifications TO anon, authenticated;
GRANT ALL ON public.stock_notifications TO service_role;

GRANT EXECUTE ON FUNCTION public.get_product_stock_by_size TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_size_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_size_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_size_stock TO service_role;
GRANT EXECUTE ON FUNCTION public.subscribe_stock_notification TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_size_stock TO anon, authenticated;
