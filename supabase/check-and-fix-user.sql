-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Verificar y arreglar problema de Auth
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ver si existe la tabla profiles y su estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- 2. Ver si tu usuario existe en auth.users
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'eloylopezruiz2005@gmail.com';

-- 3. Actualizar los metadatos del usuario para que tenga rol admin
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin", "full_name": "Eloy López"}'::jsonb
WHERE email = 'eloylopezruiz2005@gmail.com';

-- 4. Verificar que se actualizó
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'eloylopezruiz2005@gmail.com';
