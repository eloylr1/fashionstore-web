# 🔐 Configuración de OAuth - FashionMarket

Esta guía explica cómo configurar los proveedores de autenticación social (Google, Facebook, GitHub) en tu tienda FashionMarket.

## 📋 Requisitos Previos

1. Tener acceso al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Cuentas de desarrollador en los proveedores que quieras usar

---

## 🔴 Google OAuth

### Paso 1: Crear Credenciales en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs y Servicios** > **Credenciales**
4. Haz clic en **+ Crear Credenciales** > **ID de cliente OAuth**
5. Configura la pantalla de consentimiento OAuth si es necesario
6. Selecciona **Aplicación web** como tipo
7. Añade los siguientes URIs:
   - **Orígenes autorizados de JavaScript:**
     - `http://localhost:4321` (desarrollo)
     - `https://tu-dominio.com` (producción)
   - **URIs de redirección autorizados:**
     - `https://mvpaeodqrizggjpttocd.supabase.co/auth/v1/callback`

### Paso 2: Configurar en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** > **Providers** > **Google**
3. Activa Google
4. Pega tu **Client ID** y **Client Secret**
5. Guarda los cambios

---

## 🔵 Facebook OAuth

### Paso 1: Crear App en Facebook Developers

1. Ve a [Facebook Developers](https://developers.facebook.com/apps)
2. Haz clic en **Crear App**
3. Selecciona **Consumidor** o **Ninguno** según tu caso
4. Completa la información de la app
5. Ve a **Agregar productos** y selecciona **Facebook Login**
6. En **Configuración** > **Básica**, obtén tu App ID y App Secret
7. En **Facebook Login** > **Configuración**:
   - Añade a **URIs de redireccionamiento OAuth válidos:**
     - `https://mvpaeodqrizggjpttocd.supabase.co/auth/v1/callback`

### Paso 2: Configurar en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** > **Providers** > **Facebook**
3. Activa Facebook
4. Pega tu **App ID** (como Client ID) y **App Secret** (como Secret)
5. Guarda los cambios

---

## ⬛ GitHub OAuth

### Paso 1: Crear OAuth App en GitHub

1. Ve a [GitHub Developer Settings](https://github.com/settings/developers)
2. Haz clic en **New OAuth App**
3. Completa los campos:
   - **Application name:** FashionMarket
   - **Homepage URL:** `http://localhost:4321` o tu dominio
   - **Authorization callback URL:** 
     - `https://mvpaeodqrizggjpttocd.supabase.co/auth/v1/callback`
4. Haz clic en **Register application**
5. Genera un nuevo **Client Secret**

### Paso 2: Configurar en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** > **Providers** > **GitHub**
3. Activa GitHub
4. Pega tu **Client ID** y **Client Secret**
5. Guarda los cambios

---

## 🗄️ Actualizar Base de Datos

Ejecuta el siguiente script en el **SQL Editor** de Supabase para añadir soporte de OAuth a la tabla profiles:

```sql
-- Ejecutar el contenido de supabase/schema-oauth.sql
```

O simplemente copia y pega el contenido del archivo `supabase/schema-oauth.sql` en el SQL Editor.

---

## ⚙️ Variables de Entorno (Opcional)

Las credenciales OAuth se configuran directamente en Supabase Dashboard, pero puedes documentarlas en tu `.env` para referencia:

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Facebook OAuth
FACEBOOK_APP_ID=tu_facebook_app_id
FACEBOOK_APP_SECRET=tu_facebook_app_secret

# GitHub OAuth
GITHUB_CLIENT_ID=tu_github_client_id
GITHUB_CLIENT_SECRET=tu_github_client_secret
```

---

## ✅ Verificación

Para verificar que todo funciona:

1. Inicia el servidor de desarrollo: `npm run dev`
2. Ve a `http://localhost:4321/login`
3. Prueba cada botón de inicio de sesión social
4. Verifica que el usuario aparezca en:
   - Supabase Dashboard > Authentication > Users
   - Tu tabla `profiles` con el provider correcto

---

## 🐛 Solución de Problemas

### "provider is not enabled"
- El proveedor no está activado en Supabase Dashboard > Authentication > Providers

### "Invalid redirect URI"
- Verifica que la URI de callback esté configurada correctamente en el proveedor
- La URI debe ser exactamente: `https://[TU-PROJECT-REF].supabase.co/auth/v1/callback`

### El usuario no aparece en profiles
- Ejecuta el script `schema-oauth.sql` para actualizar el trigger
- Verifica que la política RLS permita insertar en profiles

### Avatar no se guarda
- Algunos proveedores usan `avatar_url`, otros usan `picture`
- El trigger actualizado maneja ambos casos

---

## 📞 Soporte

Si tienes problemas, consulta:
- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Facebook OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- [GitHub OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-github)
