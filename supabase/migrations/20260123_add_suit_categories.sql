-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Migración para insertar categorías de accesorios de traje
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-01-23
-- ═══════════════════════════════════════════════════════════════════════════

-- Desactivar temporalmente RLS para la inserción
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Insertar categorías de moda masculina
-- Solo inserta si no existe ya una categoría con el mismo slug
DO $$
DECLARE
  categories_to_insert TEXT[][] := ARRAY[
    ARRAY['Trajes', 'trajes', 'Trajes de alta calidad para el hombre moderno'],
    ARRAY['Camisas', 'camisas', 'Camisas de vestir y casuales para toda ocasión'],
    ARRAY['Pantalones', 'pantalones', 'Pantalones de vestir y casuales elegantes'],
    ARRAY['Blazers', 'blazers', 'Blazers y americanas para un look sofisticado'],
    ARRAY['Zapatos de vestir', 'zapatos-de-vestir', 'Zapatos de vestir de cuero premium'],
    ARRAY['Calcetines', 'calcetines', 'Calcetines de vestir de alta calidad'],
    ARRAY['Gemelos', 'gemelos', 'Gemelos elegantes para camisas de vestir'],
    ARRAY['Corbatas', 'corbatas', 'Corbatas de seda y materiales premium'],
    ARRAY['Pañuelos', 'panuelos', 'Pañuelos de bolsillo para un toque distintivo'],
    ARRAY['Cinturones', 'cinturones', 'Cinturones de cuero genuino artesanales'],
    ARRAY['Tirantes', 'tirantes', 'Tirantes clásicos y modernos para todo estilo'],
    ARRAY['Chaleco', 'chaleco', 'Chalecos elegantes para completar tu look']
  ];
  cat TEXT[];
BEGIN
  FOREACH cat SLICE 1 IN ARRAY categories_to_insert
  LOOP
    INSERT INTO categories (name, slug, description, created_at, updated_at)
    SELECT cat[1], cat[2], cat[3], NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM categories WHERE slug = cat[2]
    );
  END LOOP;
END $$;

-- Reactivar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Verificar las categorías insertadas
SELECT 
  id, 
  name, 
  slug, 
  description,
  created_at
FROM categories 
ORDER BY name;

-- Mostrar resumen
SELECT 
  'Total categorías: ' || COUNT(*)::TEXT as resumen
FROM categories;
