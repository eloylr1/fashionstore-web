-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Diagnóstico y limpieza completa de Auth
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ver TODOS los triggers en auth.users
SELECT 
  tgname as trigger_name,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');

-- 2. Eliminar TODOS los triggers custom en auth.users
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'users' 
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    AND tgname NOT LIKE 'RI_%' -- No eliminar triggers de integridad referencial
    AND tgname NOT LIKE 'pg_%' -- No eliminar triggers del sistema
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_rec.tgname);
    RAISE NOTICE 'Eliminado trigger: %', trigger_rec.tgname;
  END LOOP;
END $$;

-- 3. Eliminar funciones problemáticas
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 4. Verificar que no quedan triggers custom
SELECT tgname FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');
