-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Arreglar columnas de payment_methods
-- Fecha: 2026-02-02
-- Descripción: Añade columnas faltantes para guardar métodos de pago correctamente
-- ═══════════════════════════════════════════════════════════════════════════

-- Añadir columna label si no existe
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS label VARCHAR(255);

-- Añadir columna stripe_payment_method_id si no existe (CRÍTICA para pagos)
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);

-- Renombrar card_brand a brand si existe (más limpio)
-- Primero añadimos brand
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS brand VARCHAR(20);

-- Añadir last_four
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS last_four VARCHAR(4);

-- Copiar datos de columnas antiguas a nuevas (si existen datos)
UPDATE public.payment_methods 
SET brand = card_brand 
WHERE brand IS NULL AND card_brand IS NOT NULL;

UPDATE public.payment_methods 
SET last_four = card_last4 
WHERE last_four IS NULL AND card_last4 IS NOT NULL;

-- Crear índice para búsqueda rápida por stripe_payment_method_id
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id 
ON public.payment_methods(stripe_payment_method_id);

-- Comentario: Las columnas card_brand y card_last4 se mantienen por compatibilidad
-- pero el código usará brand y last_four
