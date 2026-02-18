-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Asegurar que user_id sea nullable en invoices
-- EJECUTAR TODO ESTE SCRIPT EN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PRIMERO: Eliminar la foreign key existente que impide nulls
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  -- Buscar el nombre de la foreign key
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'invoices' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  LIMIT 1;
  
  -- Si existe, eliminarla
  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.invoices DROP CONSTRAINT ' || fk_name;
    RAISE NOTICE 'Foreign key % eliminada', fk_name;
  END IF;
END $$;

-- 2. Hacer user_id opcional (nullable)
ALTER TABLE public.invoices 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Recrear la foreign key PERMITIENDO NULLS (ON DELETE SET NULL)
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Agregar columna guest_email si no existe (para buscar facturas de invitados)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- 5. Crear índice en customer_email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

-- 6. Verificar que todo está correcto
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name = 'user_id';

-- 7. Mostrar facturas recientes para verificar
SELECT 
  id,
  invoice_number,
  customer_email,
  user_id,
  order_id,
  created_at
FROM public.invoices 
ORDER BY created_at DESC
LIMIT 5;
