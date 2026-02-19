-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Añadir stripe_payment_method_id y stripe_customer_id
-- Fecha: 2026-02-19
-- Descripción: Columnas necesarias para pagos con tarjeta guardada
-- ═══════════════════════════════════════════════════════════════════════════

-- Añadir stripe_payment_method_id a payment_methods si no existe
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id 
ON public.payment_methods(stripe_payment_method_id);

-- Añadir stripe_customer_id a profiles para vincular con Stripe Customer
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
