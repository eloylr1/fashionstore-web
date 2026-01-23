-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Categorías para Tienda de Trajes
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Insertar categorías si no existen
INSERT INTO categories (name, slug, description, image_url)
VALUES 
  ('Trajes', 'trajes', 'Trajes completos de alta calidad para hombre', NULL),
  ('Camisas', 'camisas', 'Camisas de vestir y casual para hombre', NULL),
  ('Pantalones', 'pantalones', 'Pantalones de vestir y formales', NULL),
  ('Blazers', 'blazers', 'Blazers y americanas elegantes', NULL),
  ('Zapatos de Vestir', 'zapatos-vestir', 'Zapatos formales y de vestir', NULL),
  ('Calcetines', 'calcetines', 'Calcetines de vestir y formales', NULL),
  ('Gemelos', 'gemelos', 'Gemelos y accesorios para puños', NULL),
  ('Corbatas', 'corbatas', 'Corbatas de seda y otros materiales', NULL),
  ('Pañuelos', 'panuelos', 'Pañuelos de bolsillo elegantes', NULL),
  ('Cinturones', 'cinturones', 'Cinturones de cuero y vestir', NULL),
  ('Tirantes', 'tirantes', 'Tirantes elegantes para hombre', NULL),
  ('Chalecos', 'chalecos', 'Chalecos de traje y formales', NULL)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Verificar las categorías insertadas
SELECT id, name, slug, description FROM categories ORDER BY name;
