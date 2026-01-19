-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Crear usuarios (Cliente y Admin)
-- IMPORTANTE: Es mejor crear usuarios desde Authentication > Users > Add user
-- Este script es una alternativa si la UI no funciona
-- ═══════════════════════════════════════════════════════════════════════════

-- Primero, eliminar usuarios existentes si los hay (limpiar)
DELETE FROM public.profiles WHERE email IN ('eloylopezruizfn@gmail.com', 'eloylopezruiz2005@gmail.com');
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('eloylopezruizfn@gmail.com', 'eloylopezruiz2005@gmail.com'));
DELETE FROM auth.users WHERE email IN ('eloylopezruizfn@gmail.com', 'eloylopezruiz2005@gmail.com');

-- ═══════════════════════════════════════════════════════════════════════════
-- USUARIO 1: CLIENTE (eloylopezruizfn@gmail.com)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cliente_id uuid := gen_random_uuid();
BEGIN
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
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    cliente_id,
    'authenticated',
    'authenticated',
    'eloylopezruizfn@gmail.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Eloy Cliente"}',
    FALSE,
    NOW(),
    NOW()
  );

  -- Insertar en auth.identities (IMPORTANTE para que funcione el login)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    cliente_id,
    jsonb_build_object('sub', cliente_id::text, 'email', 'eloylopezruizfn@gmail.com', 'email_verified', true),
    'email',
    cliente_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- Insertar en public.profiles como CLIENTE
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (cliente_id, 'eloylopezruizfn@gmail.com', 'Eloy Cliente', 'customer', NOW(), NOW());

  RAISE NOTICE 'Usuario CLIENTE creado con ID: %', cliente_id;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- USUARIO 2: ADMIN (eloylopezruiz2005@gmail.com)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
BEGIN
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
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'eloylopezruiz2005@gmail.com',
    crypt('123456', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Eloy Admin"}',
    FALSE,
    NOW(),
    NOW()
  );

  -- Insertar en auth.identities (IMPORTANTE para que funcione el login)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    admin_id,
    jsonb_build_object('sub', admin_id::text, 'email', 'eloylopezruiz2005@gmail.com', 'email_verified', true),
    'email',
    admin_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- Insertar en public.profiles como ADMIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (admin_id, 'eloylopezruiz2005@gmail.com', 'Eloy Admin', 'admin', NOW(), NOW());

  RAISE NOTICE 'Usuario ADMIN creado con ID: %', admin_id;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAR QUE LOS USUARIOS SE CREARON
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmado,
  p.role,
  p.full_name
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN ('eloylopezruizfn@gmail.com', 'eloylopezruiz2005@gmail.com');
