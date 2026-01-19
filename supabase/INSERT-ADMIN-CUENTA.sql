-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Crear cuenta Admin
-- Copia TODO este archivo y pégalo en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Crear usuario admin con email y contraseña
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generar UUID para el nuevo usuario
  new_user_id := gen_random_uuid();
  
  -- Insertar en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'eloylopezruiz2005@gmail.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Eloy López Ruiz"}',
    FALSE,
    NOW(),
    NOW(),
    FALSE
  );
  
  -- Insertar en public.profiles con rol admin
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'eloylopezruiz2005@gmail.com',
    'Eloy López Ruiz',
    'admin',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Usuario admin creado con ID: %', new_user_id;
END $$;
