-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Actualización para OAuth
-- Añade soporte para múltiples proveedores de autenticación
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Añadir columna provider a profiles (si no existe)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'email';

-- Comentario para la columna
COMMENT ON COLUMN public.profiles.provider IS 'Proveedor de autenticación: email, google, facebook, github';

-- ─────────────────────────────────────────────────────────────────────────────
-- Actualizar trigger para manejar OAuth providers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider_name VARCHAR(50);
  user_full_name VARCHAR(255);
BEGIN
  -- Determinar el proveedor
  provider_name := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );
  
  -- Obtener el nombre completo (diferentes proveedores lo guardan en diferentes campos)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  -- Insertar el perfil
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    provider_name
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    provider = EXCLUDED.provider,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Índice para búsquedas por provider
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_provider ON public.profiles(provider);
