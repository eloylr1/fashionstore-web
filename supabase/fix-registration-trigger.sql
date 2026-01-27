-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Fix: Trigger de Registro de Usuarios
-- EJECUTAR EN SUPABASE SQL EDITOR
-- Este script corrige el error "Database error finding user"
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 1: Eliminar triggers y funciones existentes
-- ═══════════════════════════════════════════════════════════════════════════

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 2: Asegurar que el ENUM user_role existe
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  -- Crear el tipo si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'customer');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 3: Crear función ROBUSTA para crear perfiles
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
  user_full_name TEXT;
BEGIN
  -- Obtener el nombre del usuario de forma segura
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Determinar el rol de forma segura (siempre customer por defecto)
  BEGIN
    -- Intentar obtener el rol del metadata
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND 
       NEW.raw_user_meta_data->>'role' IN ('admin', 'customer') THEN
      user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
    ELSE
      user_role_value := 'customer'::user_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Si hay cualquier error, usar customer
    user_role_value := 'customer'::user_role;
  END;
  
  -- Insertar el perfil de forma segura
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_full_name,
      user_role_value,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
      
  EXCEPTION WHEN OTHERS THEN
    -- Log del error pero no fallar el registro
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 4: Crear el trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 5: Asegurar permisos RLS correctos para profiles
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Crear políticas nuevas
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Permitir que el trigger (SECURITY DEFINER) pueda insertar
CREATE POLICY "Service role can insert profiles" 
  ON public.profiles FOR INSERT 
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 6: Verificación
-- ═══════════════════════════════════════════════════════════════════════════

-- Ver que el trigger está creado
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' 
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  AND tgname = 'on_auth_user_created';

-- ═══════════════════════════════════════════════════════════════════════════
-- ¡LISTO! Ahora el registro de usuarios debería funcionar correctamente
-- ═══════════════════════════════════════════════════════════════════════════
