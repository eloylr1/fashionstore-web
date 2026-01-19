-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Migration Patch
-- Newsletter + Códigos de Descuento + Cancelación Atómica
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: discount_type
-- Tipos de descuento: porcentaje o cantidad fija
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: newsletter_subscriptions
-- Suscripciones al newsletter con código promo de bienvenida
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  promo_code VARCHAR(50), -- Código promo asignado al suscribirse
  promo_delivered BOOLEAN DEFAULT FALSE, -- Si el email con el código fue enviado
  is_active BOOLEAN DEFAULT TRUE,
  source VARCHAR(50) DEFAULT 'popup', -- popup, footer, checkout
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para newsletter
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_promo_code ON public.newsletter_subscriptions(promo_code);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON public.newsletter_subscriptions(is_active) WHERE is_active = TRUE;

-- Deshabilitar RLS (gestión pública de suscripciones)
ALTER TABLE public.newsletter_subscriptions DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: discount_codes
-- Códigos de descuento funcionales
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE, -- Código único (ej: WELCOME10, SUMMER20)
  type discount_type NOT NULL DEFAULT 'percentage',
  value INTEGER NOT NULL, -- Valor en % (10 = 10%) o CÉNTIMOS (1000 = 10€)
  description VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  max_uses INTEGER, -- NULL = ilimitado
  uses_count INTEGER DEFAULT 0,
  min_order_amount INTEGER DEFAULT 0, -- Mínimo de compra en CÉNTIMOS (0 = sin mínimo)
  max_discount_amount INTEGER, -- Límite máximo de descuento en CÉNTIMOS (solo para %)
  first_purchase_only BOOLEAN DEFAULT FALSE, -- Solo para primera compra
  expires_at TIMESTAMPTZ, -- NULL = sin fecha de expiración
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para discount_codes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON public.discount_codes(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_discount_codes_expires ON public.discount_codes(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_discount_codes_updated_at ON public.discount_codes;
CREATE TRIGGER set_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Deshabilitar RLS (validación en backend)
ALTER TABLE public.discount_codes DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: discount_code_redemptions
-- Registro de canjes de códigos de descuento (evita re-uso por usuario)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.discount_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount INTEGER NOT NULL, -- Cantidad descontada en CÉNTIMOS
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_id, user_id) -- Un usuario solo puede usar un código una vez
);

-- Índices para redemptions
CREATE INDEX IF NOT EXISTS idx_redemptions_code ON public.discount_code_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.discount_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_order ON public.discount_code_redemptions(order_id);

-- Deshabilitar RLS
ALTER TABLE public.discount_code_redemptions DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: validate_discount_code
-- Valida un código de descuento y devuelve info
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code VARCHAR,
  p_order_subtotal INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_id UUID,
  discount_type discount_type,
  discount_value INTEGER,
  calculated_discount INTEGER,
  error_message VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
  v_already_used BOOLEAN;
  v_user_has_orders BOOLEAN;
  v_calculated INTEGER;
BEGIN
  -- Buscar código
  SELECT * INTO v_code_record
  FROM public.discount_codes
  WHERE UPPER(code) = UPPER(p_code);
  
  -- No existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 'Código no válido'::VARCHAR;
    RETURN;
  END IF;
  
  -- No activo
  IF NOT v_code_record.active THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 'Este código ya no está activo'::VARCHAR;
    RETURN;
  END IF;
  
  -- Expirado
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 'Este código ha expirado'::VARCHAR;
    RETURN;
  END IF;
  
  -- Límite de usos alcanzado
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.uses_count >= v_code_record.max_uses THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 'Este código ha alcanzado su límite de usos'::VARCHAR;
    RETURN;
  END IF;
  
  -- Mínimo de compra
  IF p_order_subtotal < v_code_record.min_order_amount THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 
      ('Pedido mínimo de ' || (v_code_record.min_order_amount / 100.0)::VARCHAR || '€ requerido')::VARCHAR;
    RETURN;
  END IF;
  
  -- Verificar si usuario ya lo usó
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.discount_code_redemptions
      WHERE code_id = v_code_record.id AND user_id = p_user_id
    ) INTO v_already_used;
    
    IF v_already_used THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 'Ya has utilizado este código'::VARCHAR;
      RETURN;
    END IF;
    
    -- Solo primera compra
    IF v_code_record.first_purchase_only THEN
      SELECT EXISTS(
        SELECT 1 FROM public.orders
        WHERE user_id = p_user_id AND status NOT IN ('cancelled', 'refunded')
      ) INTO v_user_has_orders;
      
      IF v_user_has_orders THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::discount_type, 0, 0, 'Este código es solo para primera compra'::VARCHAR;
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- Calcular descuento
  IF v_code_record.type = 'percentage' THEN
    v_calculated := (p_order_subtotal * v_code_record.value) / 100;
    -- Aplicar límite máximo si existe
    IF v_code_record.max_discount_amount IS NOT NULL AND v_calculated > v_code_record.max_discount_amount THEN
      v_calculated := v_code_record.max_discount_amount;
    END IF;
  ELSE
    -- Descuento fijo
    v_calculated := LEAST(v_code_record.value, p_order_subtotal);
  END IF;
  
  RETURN QUERY SELECT 
    TRUE, 
    v_code_record.id, 
    v_code_record.type, 
    v_code_record.value, 
    v_calculated, 
    NULL::VARCHAR;
END;
$$;

-- Permiso para usuarios autenticados y anónimos
GRANT EXECUTE ON FUNCTION public.validate_discount_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discount_code TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: cancel_order_and_restore_stock
-- Cancelación ATÓMICA: cambia estado a 'cancelled' y restaura stock
-- SOLO permite cancelar pedidos con status = 'paid'
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(p_order_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message VARCHAR,
  order_number VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_user_id UUID;
  v_order_number VARCHAR;
BEGIN
  -- 1) Obtener usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Debes iniciar sesión para cancelar un pedido'::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;
  
  -- 2) Obtener pedido con bloqueo FOR UPDATE (evita race conditions)
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  -- Verificar que existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Pedido no encontrado'::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;
  
  v_order_number := v_order.order_number;
  
  -- 3) Verificar que el pedido pertenece al usuario
  IF v_order.user_id != v_user_id THEN
    RETURN QUERY SELECT FALSE, 'No tienes permiso para cancelar este pedido'::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;
  
  -- 4) Verificar estado: SOLO se puede cancelar si está 'paid'
  IF v_order.status != 'paid' THEN
    RETURN QUERY SELECT FALSE, 
      ('No se puede cancelar. Estado actual: ' || v_order.status::VARCHAR || '. Solo pedidos pagados pueden cancelarse.')::VARCHAR, 
      v_order_number;
    RETURN;
  END IF;
  
  -- 5) Cambiar estado del pedido a 'cancelled'
  UPDATE public.orders
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_order_id;
  
  -- 6) Restaurar stock de cada item (solo si product_id no es NULL)
  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.product_id IS NOT NULL
  LOOP
    UPDATE public.products
    SET stock = stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;
  END LOOP;
  
  -- 7) Retornar éxito
  RETURN QUERY SELECT TRUE, 'Pedido cancelado correctamente. El stock ha sido restaurado.'::VARCHAR, v_order_number;
END;
$$;

-- Permiso solo para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: apply_discount_code (para usar en checkout)
-- Registra el canje e incrementa el contador de usos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_discount_code(
  p_code_id UUID,
  p_order_id UUID,
  p_discount_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Registrar canje
  INSERT INTO public.discount_code_redemptions (code_id, user_id, order_id, discount_amount)
  VALUES (p_code_id, v_user_id, p_order_id, p_discount_amount)
  ON CONFLICT (code_id, user_id) DO NOTHING;
  
  -- Incrementar contador de usos
  UPDATE public.discount_codes
  SET uses_count = uses_count + 1
  WHERE id = p_code_id;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_discount_code TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATOS INICIALES: Códigos de descuento de ejemplo
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.discount_codes (code, type, value, description, min_order_amount, first_purchase_only) VALUES
  ('WELCOME10', 'percentage', 10, '10% de descuento en tu primera compra', 5000, TRUE),
  ('NEWSLETTER15', 'percentage', 15, '15% para suscriptores del newsletter', 3000, FALSE),
  ('ENVIOGRATIS', 'fixed', 499, 'Envío gratis (4.99€ de descuento)', 0, FALSE)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DEL PATCH
-- ═══════════════════════════════════════════════════════════════════════════
