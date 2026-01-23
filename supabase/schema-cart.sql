-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Esquema de Carrito de Usuario
-- Ejecutar en Supabase SQL Editor
-- PARTE 1: Solo tabla de carrito (ejecutar primero)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: user_cart_items - Carrito persistente por usuario
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, size)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_cart_user ON public.user_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cart_product ON public.user_cart_items(product_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_cart_updated_at ON public.user_cart_items;
CREATE TRIGGER set_user_cart_updated_at
  BEFORE UPDATE ON public.user_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cart_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: Obtener carrito del usuario con datos de productos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_cart(p_user_id UUID)
RETURNS TABLE (
  product_id UUID,
  name VARCHAR,
  slug VARCHAR,
  price INTEGER,
  quantity INTEGER,
  size VARCHAR,
  image TEXT,
  stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.product_id,
    p.name,
    p.slug,
    p.price,
    c.quantity,
    c.size,
    COALESCE(p.images[1], '/placeholder.jpg') as image,
    p.stock
  FROM public.user_cart_items c
  JOIN public.products p ON p.id = c.product_id
  WHERE c.user_id = p_user_id
  ORDER BY c.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: Sincronizar carrito al hacer login (merge localStorage + DB)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_cart_on_login(
  p_user_id UUID,
  p_local_items JSONB
)
RETURNS TABLE (
  product_id UUID,
  name VARCHAR,
  slug VARCHAR,
  price INTEGER,
  quantity INTEGER,
  size VARCHAR,
  image TEXT,
  stock INTEGER
) AS $$
DECLARE
  item JSONB;
  v_product_id UUID;
  v_size VARCHAR;
  v_quantity INTEGER;
BEGIN
  -- Insertar items del localStorage que no existan en DB
  FOR item IN SELECT * FROM jsonb_array_elements(p_local_items)
  LOOP
    v_product_id := (item->>'productId')::UUID;
    v_size := item->>'size';
    v_quantity := (item->>'quantity')::INTEGER;
    
    -- Upsert: insertar o actualizar si existe
    INSERT INTO public.user_cart_items (user_id, product_id, size, quantity)
    VALUES (p_user_id, v_product_id, v_size, v_quantity)
    ON CONFLICT (user_id, product_id, size) 
    DO UPDATE SET quantity = GREATEST(user_cart_items.quantity, EXCLUDED.quantity),
                  updated_at = NOW();
  END LOOP;
  
  -- Retornar el carrito completo actualizado
  RETURN QUERY SELECT * FROM get_user_cart(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_user_cart(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_cart_on_login(UUID, JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies para user_cart_items
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_cart_items ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver su propio carrito
CREATE POLICY "Users can view their own cart" ON public.user_cart_items
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios solo pueden insertar en su propio carrito
CREATE POLICY "Users can insert into their own cart" ON public.user_cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar su propio carrito
CREATE POLICY "Users can update their own cart" ON public.user_cart_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Los usuarios solo pueden eliminar de su propio carrito
CREATE POLICY "Users can delete from their own cart" ON public.user_cart_items
  FOR DELETE USING (auth.uid() = user_id);
