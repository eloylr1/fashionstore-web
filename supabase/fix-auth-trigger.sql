-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Eliminar trigger problemático
-- Ejecutar PRIMERO en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Eliminar el trigger que causa el error durante el login
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar la función asociada
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verificar que se eliminó
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
