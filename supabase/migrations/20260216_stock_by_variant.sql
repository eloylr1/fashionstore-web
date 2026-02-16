-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Stock por Talla y Color
-- Extiende el sistema de stock para incluir también colores
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- MODIFICAR TABLA: product_size_stock -> product_variant_stock
-- Ahora incluye talla Y color para cada variante
-- ─────────────────────────────────────────────────────────────────────────────

-- Renombrar tabla si existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_size_stock') THEN
    -- Añadir columna color si no existe
    ALTER TABLE public.product_size_stock ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT NULL;
    
    -- Renombrar tabla
    ALTER TABLE IF EXISTS public.product_size_stock RENAME TO product_variant_stock;
    
    -- Actualizar constraint único
    ALTER TABLE public.product_variant_stock DROP CONSTRAINT IF EXISTS product_size_stock_product_id_size_key;
    ALTER TABLE public.product_variant_stock DROP CONSTRAINT IF EXISTS product_variant_stock_unique;
    ALTER TABLE public.product_variant_stock ADD CONSTRAINT product_variant_stock_unique UNIQUE(product_id, size, color);
  END IF;
END $$;

-- Si no existía la tabla anterior, crear la nueva
CREATE TABLE IF NOT EXISTS public.product_variant_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size VARCHAR(20),
  color VARCHAR(50),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_variant_stock_unique UNIQUE(product_id, size, color)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_variant_stock_product ON public.product_variant_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_stock_size ON public.product_variant_stock(product_id, size);
CREATE INDEX IF NOT EXISTS idx_variant_stock_color ON public.product_variant_stock(product_id, color);
CREATE INDEX IF NOT EXISTS idx_variant_stock_low ON public.product_variant_stock(stock) WHERE stock < 5;

-- Trigger para auto-update updated_at
DROP TRIGGER IF EXISTS set_variant_stock_updated_at ON public.product_variant_stock;
CREATE TRIGGER set_variant_stock_updated_at
  BEFORE UPDATE ON public.product_variant_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- MODIFICAR TABLA: stock_notifications
-- Incluir también color en las notificaciones
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.stock_notifications ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT NULL;

-- Actualizar constraint único
ALTER TABLE public.stock_notifications DROP CONSTRAINT IF EXISTS stock_notifications_product_id_size_email_key;
ALTER TABLE public.stock_notifications DROP CONSTRAINT IF EXISTS stock_notifications_unique;
ALTER TABLE public.stock_notifications ADD CONSTRAINT stock_notifications_unique UNIQUE(product_id, size, color, email);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Decrementar stock de variante (talla + color)
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
  -- Obtener stock actual
  SELECT stock INTO current_stock
  FROM public.product_variant_stock
  WHERE product_id = p_product_id 
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color)
  FOR UPDATE;
  
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Variante no encontrada';
  END IF;
  
  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %', current_stock;
  END IF;
  
  new_stock := current_stock - p_quantity;
  
  -- Actualizar stock
  UPDATE public.product_variant_stock
  SET stock = new_stock, updated_at = NOW()
  WHERE product_id = p_product_id 
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color);
  
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
-- FUNCIÓN: Incrementar stock de variante
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

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Obtener stock de variante
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_variant_stock(
  p_product_id UUID,
  p_size VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock
  FROM public.product_variant_stock
  WHERE product_id = p_product_id 
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color);
  
  RETURN COALESCE(current_stock, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Actualizar stock de variante (upsert)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_variant_stock(
  p_product_id UUID,
  p_size VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL,
  p_stock INTEGER DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_stock INTEGER;
BEGIN
  -- Obtener stock anterior
  SELECT stock INTO old_stock
  FROM public.product_variant_stock
  WHERE product_id = p_product_id 
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color);
  
  -- Insertar o actualizar
  INSERT INTO public.product_variant_stock (product_id, size, color, stock)
  VALUES (p_product_id, p_size, p_color, p_stock)
  ON CONFLICT (product_id, size, color)
  DO UPDATE SET stock = p_stock, updated_at = NOW();
  
  -- Actualizar stock total del producto
  UPDATE public.products
  SET stock = (
    SELECT COALESCE(SUM(stock), 0)
    FROM public.product_variant_stock
    WHERE product_id = p_product_id
  )
  WHERE id = p_product_id;
  
  RETURN COALESCE(old_stock, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Suscribirse a notificación de stock
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.subscribe_variant_notification(
  p_product_id UUID,
  p_email VARCHAR,
  p_size VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.stock_notifications (product_id, size, color, email, user_id)
  VALUES (p_product_id, p_size, p_color, p_email, p_user_id)
  ON CONFLICT (product_id, size, color, email) DO UPDATE
  SET notified = FALSE, notified_at = NULL, created_at = NOW()
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.product_variant_stock ENABLE ROW LEVEL SECURITY;

-- Lectura pública
DROP POLICY IF EXISTS "variant_stock_select" ON public.product_variant_stock;
CREATE POLICY "variant_stock_select" ON public.product_variant_stock
  FOR SELECT USING (true);

-- Escritura solo para admins
DROP POLICY IF EXISTS "variant_stock_admin" ON public.product_variant_stock;
CREATE POLICY "variant_stock_admin" ON public.product_variant_stock
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRAR: Datos de product_size_stock a product_variant_stock si hay datos
-- ─────────────────────────────────────────────────────────────────────────────

-- Migrar productos que tienen solo tallas (sin colores) si aún no tienen datos
DO $$
DECLARE
  p RECORD;
  size_item TEXT;
  color_item TEXT;
  num_variants INT;
  stock_per_variant INT;
BEGIN
  FOR p IN 
    SELECT id, stock, sizes, colors 
    FROM public.products 
    WHERE stock > 0 
      AND (sizes IS NOT NULL AND array_length(sizes, 1) > 0)
      AND NOT EXISTS (
        SELECT 1 FROM public.product_variant_stock WHERE product_id = id
      )
  LOOP
    -- Calcular número de variantes
    IF p.colors IS NOT NULL AND array_length(p.colors, 1) > 0 THEN
      -- Tiene tallas Y colores
      num_variants := array_length(p.sizes, 1) * array_length(p.colors, 1);
      stock_per_variant := GREATEST(1, p.stock / num_variants);
      
      FOREACH size_item IN ARRAY p.sizes
      LOOP
        FOREACH color_item IN ARRAY p.colors
        LOOP
          INSERT INTO public.product_variant_stock (product_id, size, color, stock)
          VALUES (p.id, size_item, color_item, stock_per_variant)
          ON CONFLICT (product_id, size, color) DO NOTHING;
        END LOOP;
      END LOOP;
    ELSE
      -- Solo tallas
      num_variants := array_length(p.sizes, 1);
      stock_per_variant := GREATEST(1, p.stock / num_variants);
      
      FOREACH size_item IN ARRAY p.sizes
      LOOP
        INSERT INTO public.product_variant_stock (product_id, size, color, stock)
        VALUES (p.id, size_item, NULL, stock_per_variant)
        ON CONFLICT (product_id, size, color) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Productos que solo tienen colores (sin tallas)
  FOR p IN 
    SELECT id, stock, colors 
    FROM public.products 
    WHERE stock > 0 
      AND (sizes IS NULL OR array_length(sizes, 1) IS NULL OR array_length(sizes, 1) = 0)
      AND (colors IS NOT NULL AND array_length(colors, 1) > 0)
      AND NOT EXISTS (
        SELECT 1 FROM public.product_variant_stock WHERE product_id = id
      )
  LOOP
    num_variants := array_length(p.colors, 1);
    stock_per_variant := GREATEST(1, p.stock / num_variants);
    
    FOREACH color_item IN ARRAY p.colors
    LOOP
      INSERT INTO public.product_variant_stock (product_id, size, color, stock)
      VALUES (p.id, NULL, color_item, stock_per_variant)
      ON CONFLICT (product_id, size, color) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Conceder permisos
GRANT SELECT ON public.product_variant_stock TO anon, authenticated;
GRANT ALL ON public.product_variant_stock TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_variant_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_variant_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_variant_stock TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.subscribe_variant_notification TO anon, authenticated, service_role;
