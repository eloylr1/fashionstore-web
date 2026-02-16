-- ═══════════════════════════════════════════════════════════════════════════
-- SINCRONIZAR: Stock de variantes con stock de productos
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Paso 1: Limpiar variantes huérfanas o con datos incorrectos
DELETE FROM public.product_variant_stock
WHERE product_id NOT IN (SELECT id FROM public.products);

-- Paso 2: Redistribuir stock para todos los productos
DO $$
DECLARE
  p RECORD;
  size_item TEXT;
  color_item TEXT;
  variant_count INT;
  stock_per_variant INT;
  remainder INT;
  counter INT;
BEGIN
  -- Para cada producto con stock
  FOR p IN 
    SELECT id, stock, sizes, colors 
    FROM public.products 
    WHERE stock > 0 
      AND sizes IS NOT NULL 
      AND array_length(sizes, 1) > 0
  LOOP
    -- Eliminar variantes existentes de este producto
    DELETE FROM public.product_variant_stock WHERE product_id = p.id;
    
    -- Calcular número de variantes
    IF p.colors IS NOT NULL AND array_length(p.colors, 1) > 0 THEN
      -- Tiene tallas Y colores
      variant_count := array_length(p.sizes, 1) * array_length(p.colors, 1);
      stock_per_variant := p.stock / variant_count;
      remainder := p.stock % variant_count;
      counter := 0;
      
      FOREACH size_item IN ARRAY p.sizes
      LOOP
        FOREACH color_item IN ARRAY p.colors
        LOOP
          INSERT INTO public.product_variant_stock (product_id, size, color, stock)
          VALUES (
            p.id, 
            size_item, 
            color_item, 
            CASE WHEN counter < remainder THEN stock_per_variant + 1 ELSE stock_per_variant END
          );
          counter := counter + 1;
        END LOOP;
      END LOOP;
    ELSE
      -- Solo tallas (sin colores)
      variant_count := array_length(p.sizes, 1);
      stock_per_variant := p.stock / variant_count;
      remainder := p.stock % variant_count;
      counter := 0;
      
      FOREACH size_item IN ARRAY p.sizes
      LOOP
        INSERT INTO public.product_variant_stock (product_id, size, color, stock)
        VALUES (
          p.id, 
          size_item, 
          NULL, 
          CASE WHEN counter < remainder THEN stock_per_variant + 1 ELSE stock_per_variant END
        );
        counter := counter + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Productos que solo tienen colores (sin tallas)
  FOR p IN 
    SELECT id, stock, colors 
    FROM public.products 
    WHERE stock > 0 
      AND (sizes IS NULL OR array_length(sizes, 1) IS NULL OR array_length(sizes, 1) = 0)
      AND colors IS NOT NULL 
      AND array_length(colors, 1) > 0
  LOOP
    DELETE FROM public.product_variant_stock WHERE product_id = p.id;
    
    variant_count := array_length(p.colors, 1);
    stock_per_variant := p.stock / variant_count;
    remainder := p.stock % variant_count;
    counter := 0;
    
    FOREACH color_item IN ARRAY p.colors
    LOOP
      INSERT INTO public.product_variant_stock (product_id, size, color, stock)
      VALUES (
        p.id, 
        NULL, 
        color_item, 
        CASE WHEN counter < remainder THEN stock_per_variant + 1 ELSE stock_per_variant END
      );
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Paso 3: Verificar que los totales coinciden
SELECT 
  p.name,
  p.stock as "Stock Producto",
  COALESCE(SUM(v.stock), 0) as "Stock Variantes",
  CASE 
    WHEN p.stock = COALESCE(SUM(v.stock), 0) THEN '✓ OK'
    ELSE '✗ ERROR'
  END as "Estado"
FROM public.products p
LEFT JOIN public.product_variant_stock v ON p.id = v.product_id
WHERE p.stock > 0
GROUP BY p.id, p.name, p.stock
ORDER BY p.name;
