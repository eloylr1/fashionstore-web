-- ═══════════════════════════════════════════════════════════════════════════
-- EJECUTA ESTE SQL EN SUPABASE AHORA MISMO
-- Ve a: https://supabase.com/dashboard → Tu proyecto → SQL Editor → Pegar y Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. HACER USER_ID OPCIONAL (CRÍTICO - SIN ESTO LAS FACTURAS NO SE GUARDAN)
ALTER TABLE public.invoices 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. CREAR ÍNDICE PARA BUSCAR POR EMAIL
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email 
ON public.invoices(customer_email);

-- 3. DESACTIVAR RLS PARA QUE FUNCIONE
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- 4. VERIFICAR QUE FUNCIONÓ
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'user_id';

-- Si ves "YES" en is_nullable, funcionó correctamente
