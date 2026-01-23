-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Script para insertar categorías de accesorios de traje
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Insertar categorías solo si no existen
INSERT INTO categories (name, slug, description, image_url)
SELECT * FROM (VALUES
  ('Trajes', 'trajes', 'Trajes de alta calidad para el hombre moderno', NULL),
  ('Camisas', 'camisas', 'Camisas de vestir y casuales para toda ocasión', NULL),
  ('Pantalones', 'pantalones', 'Pantalones de vestir y casuales elegantes', NULL),
  ('Blazers', 'blazers', 'Blazers y americanas para un look sofisticado', NULL),
  ('Zapatos de vestir', 'zapatos-de-vestir', 'Zapatos de vestir de cuero premium', NULL),
  ('Calcetines', 'calcetines', 'Calcetines de vestir de alta calidad', NULL),
  ('Gemelos', 'gemelos', 'Gemelos elegantes para camisas de vestir', NULL),
  ('Corbatas', 'corbatas', 'Corbatas de seda y materiales premium', NULL),
  ('Pañuelos', 'panuelos', 'Pañuelos de bolsillo para un toque distintivo', NULL),
  ('Cinturones', 'cinturones', 'Cinturones de cuero genuino artesanales', NULL),
  ('Tirantes', 'tirantes', 'Tirantes clásicos y modernos para todo estilo', NULL),
  ('Chaleco', 'chaleco', 'Chalecos elegantes para completar tu look', NULL)
) AS new_categories(name, slug, description, image_url)
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE categories.slug = new_categories.slug
);

-- Verificar las categorías insertadas
SELECT id, name, slug, description FROM categories ORDER BY name;
