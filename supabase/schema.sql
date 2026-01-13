-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Esquema de Base de Datos
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────────────────────────────────────────

-- UUID generation (ya debería estar habilitada por defecto)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: user_role
-- Roles de usuario (admin para jefes/administradores, customer para clientes)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: profiles
-- Perfiles de usuarios con roles (admin o customer)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'España',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: categories
-- Categorías de productos (Camisas, Pantalones, Trajes, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por slug
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: products
-- Catálogo de productos de la tienda
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0), -- Precio en CÉNTIMOS (5999 = 59.99€)
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  images TEXT[] DEFAULT '{}', -- Array de URLs de imágenes
  sizes TEXT[] DEFAULT '{}', -- Array de tallas disponibles (XS, S, M, L, XL, XXL)
  colors TEXT[] DEFAULT '{}', -- Array de colores disponibles
  material VARCHAR(100),
  featured BOOLEAN DEFAULT FALSE, -- Producto destacado en homepage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock) WHERE stock < 10;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-update updated_at
-- Actualiza automáticamente el campo updated_at en cada modificación
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a categories
DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a products
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Políticas de seguridad a nivel de fila
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS en tablas públicas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- PROFILES: Deshabilitar RLS (la seguridad se maneja en el código)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ─── Políticas para CATEGORIES ───

-- Lectura pública (todos pueden ver categorías)
DROP POLICY IF EXISTS "Lectura pública de categorías" ON public.categories;
CREATE POLICY "Lectura pública de categorías"
  ON public.categories
  FOR SELECT
  USING (true);

-- Escritura solo para usuarios autenticados (admins)
DROP POLICY IF EXISTS "Admins pueden insertar categorías" ON public.categories;
CREATE POLICY "Admins pueden insertar categorías"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins pueden actualizar categorías" ON public.categories;
CREATE POLICY "Admins pueden actualizar categorías"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins pueden eliminar categorías" ON public.categories;
CREATE POLICY "Admins pueden eliminar categorías"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (true);

-- ─── Políticas para PRODUCTS ───

-- Lectura pública (todos pueden ver productos)
DROP POLICY IF EXISTS "Lectura pública de productos" ON public.products;
CREATE POLICY "Lectura pública de productos"
  ON public.products
  FOR SELECT
  USING (true);

-- Escritura solo para usuarios autenticados (admins)
DROP POLICY IF EXISTS "Admins pueden insertar productos" ON public.products;
CREATE POLICY "Admins pueden insertar productos"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins pueden actualizar productos" ON public.products;
CREATE POLICY "Admins pueden actualizar productos"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins pueden eliminar productos" ON public.products;
CREATE POLICY "Admins pueden eliminar productos"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- DATOS INICIALES (Seed)
-- Categorías base para la tienda
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.categories (name, slug, description) VALUES
  ('Camisas', 'camisas', 'Camisas de vestir y casuales para hombre. Desde Oxford clásicas hasta linos de verano.'),
  ('Pantalones', 'pantalones', 'Pantalones de vestir, chinos y casuales. Cortes modernos y clásicos.'),
  ('Trajes', 'trajes', 'Trajes completos y blazers. Elegancia para cada ocasión.')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLAS ADICIONALES PARA CUENTA DE USUARIO
-- ─────────────────────────────────────────────────────────────────────────────

-- TABLA: addresses - Direcciones de envío
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'Casa',
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'España',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);
ALTER TABLE public.addresses DISABLE ROW LEVEL SECURITY;

-- TABLA: payment_methods - Métodos de pago
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'card',
  card_brand VARCHAR(20),
  card_last4 VARCHAR(4),
  card_holder_name VARCHAR(255),
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;

-- TABLA: orders - Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  subtotal INTEGER NOT NULL,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- TABLA: order_items - Items de pedidos
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  size VARCHAR(10),
  color VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;

-- TABLA: wishlist - Lista de deseos
CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);
ALTER TABLE public.wishlist DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTOS DE EJEMPLO (opcional - descomentar para testing)
-- ─────────────────────────────────────────────────────────────────────────────

/*
INSERT INTO public.products (name, slug, description, price, stock, category_id, sizes, colors, material, featured, images) 
SELECT 
  'Camisa Oxford Clásica',
  'camisa-oxford-clasica',
  'Camisa Oxford de algodón 100% con cuello button-down. Un básico atemporal para cualquier ocasión.',
  5999, -- 59.99€
  50,
  c.id,
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['Azul Cielo', 'Blanco'],
  '100% Algodón',
  true,
  ARRAY[]::TEXT[]
FROM public.categories c WHERE c.slug = 'camisas';

INSERT INTO public.products (name, slug, description, price, stock, category_id, sizes, colors, material, featured, images) 
SELECT 
  'Pantalón Chino Slim',
  'pantalon-chino-slim',
  'Pantalón chino de corte slim en algodón elástico. Comodidad y elegancia casual.',
  7999, -- 79.99€
  35,
  c.id,
  ARRAY['S', 'M', 'L', 'XL', 'XXL'],
  ARRAY['Beige', 'Navy'],
  '98% Algodón, 2% Elastano',
  true,
  ARRAY[]::TEXT[]
FROM public.categories c WHERE c.slug = 'pantalones';

INSERT INTO public.products (name, slug, description, price, stock, category_id, sizes, colors, material, featured, images) 
SELECT 
  'Traje Ejecutivo Navy',
  'traje-ejecutivo-navy',
  'Traje de dos piezas en lana italiana. Corte contemporáneo slim fit. Incluye chaqueta y pantalón.',
  34999, -- 349.99€
  15,
  c.id,
  ARRAY['46', '48', '50', '52', '54'],
  ARRAY['Azul Marino', 'Charcoal'],
  '100% Lana Italiana',
  true,
  ARRAY[]::TEXT[]
FROM public.categories c WHERE c.slug = 'trajes';
*/
