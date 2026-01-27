-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Función para incrementar usos de código de descuento
-- ═══════════════════════════════════════════════════════════════════════════

-- Función RPC para incrementar contador de usos de forma segura
CREATE OR REPLACE FUNCTION increment_discount_uses(code_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE discount_codes
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = code_id;
END;
$$;

-- Dar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION increment_discount_uses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_discount_uses(UUID) TO service_role;
