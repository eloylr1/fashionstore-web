-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Corregir funciones de stock para usar product_variant_stock
-- Fecha: 2026-02-18
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: cancel_order_and_restore_stock (ACTUALIZADA)
-- Ahora usa product_variant_stock con color
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
  -- 1) Verificar que el pedido existe y pertenece al usuario o es admin
  SELECT o.id, o.status, o.order_number, o.total, o.user_id INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
    AND (
      o.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  
  IF v_order IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Pedido no encontrado o no tienes permisos'::VARCHAR, NULL::VARCHAR;
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
  
  -- 6) Restaurar stock de cada item POR TALLA Y COLOR
  FOR v_item IN 
    SELECT product_id, quantity, size, color
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      -- Restaurar stock usando increment_variant_stock
      PERFORM public.increment_variant_stock(
        v_item.product_id, 
        v_item.size, 
        v_item.color,
        v_item.quantity
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT TRUE, 'Pedido cancelado correctamente. El stock ha sido restaurado.'::VARCHAR, v_order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar permisos
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: decrement_variant_stock (versión robusta)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_variant_stock(
  p_product_id UUID,
  p_size VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Obtener stock actual con lock
  SELECT stock INTO current_stock
  FROM public.product_variant_stock
  WHERE product_id = p_product_id 
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color)
  FOR UPDATE;
  
  -- Si no existe la variante, intentar crear con stock 0 (fallará la validación)
  IF current_stock IS NULL THEN
    -- Intentar buscar sin color si no se encontró
    IF p_color IS NOT NULL THEN
      SELECT stock INTO current_stock
      FROM public.product_variant_stock
      WHERE product_id = p_product_id 
        AND (size IS NOT DISTINCT FROM p_size)
        AND color IS NULL
      FOR UPDATE;
    END IF;
    
    IF current_stock IS NULL THEN
      RAISE EXCEPTION 'Variante no encontrada para producto %, talla %, color %', p_product_id, p_size, p_color;
    END IF;
  END IF;
  
  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', current_stock, p_quantity;
  END IF;
  
  new_stock := current_stock - p_quantity;
  
  -- Actualizar stock de la variante
  UPDATE public.product_variant_stock
  SET stock = new_stock, updated_at = NOW()
  WHERE product_id = p_product_id 
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color);
    
  -- Si actualizamos variante sin color como fallback
  IF NOT FOUND AND p_color IS NOT NULL THEN
    UPDATE public.product_variant_stock
    SET stock = new_stock, updated_at = NOW()
    WHERE product_id = p_product_id 
      AND (size IS NOT DISTINCT FROM p_size)
      AND color IS NULL;
  END IF;
  
  -- Actualizar stock total del producto
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM public.product_variant_stock
    WHERE product_id = p_product_id
  )
  WHERE id = p_product_id;
  
  RETURN new_stock;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: increment_variant_stock (versión robusta)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_variant_stock(
  p_product_id UUID,
  p_size VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  -- Insertar o actualizar
  INSERT INTO public.product_variant_stock (product_id, size, color, stock)
  VALUES (p_product_id, p_size, p_color, p_quantity)
  ON CONFLICT (product_id, size, color)
  DO UPDATE SET stock = product_variant_stock.stock + p_quantity, updated_at = NOW()
  RETURNING stock INTO new_stock;
  
  -- Actualizar stock total del producto
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM public.product_variant_stock
    WHERE product_id = p_product_id
  )
  WHERE id = p_product_id;
  
  RETURN new_stock;
END;
$$;

-- Asegurar permisos
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALIAS: Mantener compatibilidad con código antiguo
-- ─────────────────────────────────────────────────────────────────────────────

-- Alias para código que usa decrement_size_stock
CREATE OR REPLACE FUNCTION public.decrement_size_stock(
  p_product_id UUID,
  p_size VARCHAR,
  p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.decrement_variant_stock(p_product_id, p_size, NULL, p_quantity);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Alias para código que usa increment_size_stock  
CREATE OR REPLACE FUNCTION public.increment_size_stock(
  p_product_id UUID,
  p_size VARCHAR,
  p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.increment_variant_stock(p_product_id, p_size, NULL, p_quantity);
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_size_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_size_stock TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_size_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_size_stock TO service_role;
