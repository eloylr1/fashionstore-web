-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Añadir stripe_payment_method_id a payment_methods
-- Fecha: 2026-02-19
-- Descripción: Columna necesaria para pagos con tarjeta guardada
-- ═══════════════════════════════════════════════════════════════════════════

-- Añadir stripe_payment_method_id si no existe
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id 
ON public.payment_methods(stripe_payment_method_id);
