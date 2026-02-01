-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Permitir facturas para usuarios invitados
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Hacer user_id opcional en invoices
ALTER TABLE public.invoices 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Agregar índice para buscar facturas por email de cliente
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

-- 3. Verificar que RLS esté deshabilitado para la tabla invoices
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- 4. Agregar columna guest_email si no existe (para búsquedas)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'invoices' 
                 AND column_name = 'guest_email') THEN
    ALTER TABLE public.invoices ADD COLUMN guest_email TEXT;
  END IF;
END $$;

-- 5. También asegurar que orders permita user_id null
ALTER TABLE public.orders 
ALTER COLUMN user_id DROP NOT NULL;

-- 6. Agregar columnas de invitado a orders si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'orders' 
                 AND column_name = 'guest_email') THEN
    ALTER TABLE public.orders ADD COLUMN guest_email TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'orders' 
                 AND column_name = 'guest_name') THEN
    ALTER TABLE public.orders ADD COLUMN guest_name TEXT;
  END IF;
END $$;

-- 7. Verificar la estructura de la tabla invoices
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'invoices'
ORDER BY ordinal_position;
