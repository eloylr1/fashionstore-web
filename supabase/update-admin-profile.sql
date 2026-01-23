-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Actualizar/Crear perfil admin para usuario existente
-- Ejecutar en Supabase SQL Editor
-- Cambia el email por el que uses para admin
-- ═══════════════════════════════════════════════════════════════════════════

-- Variable con tu email de admin (CAMBIA ESTO si es diferente)
DO $$
DECLARE
  admin_email TEXT := 'eloylopezruiz2005@gmail.com';
  admin_user_id UUID;
BEGIN
  -- Buscar el ID del usuario en auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Usuario con email % no encontrado en auth.users', admin_email;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Usuario encontrado con ID: %', admin_user_id;
  
  -- Insertar o actualizar el perfil
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    admin_user_id,
    admin_email,
    'Administrador',
    'admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();
  
  RAISE NOTICE 'Perfil admin creado/actualizado para: %', admin_email;
END $$;

-- Verificar que el perfil existe ahora
SELECT id, email, full_name, role FROM public.profiles WHERE role = 'admin';
