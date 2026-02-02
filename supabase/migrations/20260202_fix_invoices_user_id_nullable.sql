-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Hacer user_id opcional en invoices
-- Fecha: 2026-02-02
-- Descripción: Permite crear facturas sin user_id para usuarios logueados
--              que por algún motivo no tienen el ID detectado
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Hacer user_id opcional
ALTER TABLE public.invoices 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Agregar columna guest_email si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'guest_email') THEN
    ALTER TABLE public.invoices ADD COLUMN guest_email TEXT;
  END IF;
END $$;

-- 3. Agregar columnas de costos adicionales si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'shipping_cost') THEN
    ALTER TABLE public.invoices ADD COLUMN shipping_cost INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'cod_extra_cost') THEN
    ALTER TABLE public.invoices ADD COLUMN cod_extra_cost INTEGER DEFAULT 0;
  END IF;
END $$;

-- 4. Crear índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

-- 5. Asegurar que RLS esté desactivado
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- 6. Verificar estructura
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices'
ORDER BY ordinal_position;
