# FashionMarket - E-commerce Headless

> Tienda online de moda masculina premium construida con Astro 5.0, Tailwind CSS y Supabase.

## 🚀 Stack Tecnológico

- **Frontend**: Astro 5.0 (SSG por defecto + SSR para admin)
- **Estilos**: Tailwind CSS 4.0 con tema personalizado
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Estado**: Nano Stores (carrito persistente)
- **Islas interactivas**: React 19

## 📁 Estructura del Proyecto

```
FASHION-STORE/
├── public/                     # Assets estáticos
│   ├── favicon.svg
│   ├── hero-image.svg          # Hero principal
│   ├── og-image.svg            # Open Graph
│   └── placeholder-*.svg       # Placeholders
│
├── src/
│   ├── components/
│   │   ├── admin/              # Componentes del backoffice
│   │   │   ├── AdminHeader.astro
│   │   │   ├── AdminSidebar.astro
│   │   │   └── ImageUploader.tsx    # ⚛️ Isla React - Drag & Drop
│   │   │
│   │   ├── cart/               # Componentes del carrito
│   │   │   ├── CartButton.tsx       # ⚛️ Isla React
│   │   │   └── CartSlideOver.tsx    # ⚛️ Isla React - Panel lateral
│   │   │
│   │   ├── layout/             # Componentes de estructura
│   │   │   ├── Header.astro
│   │   │   └── Footer.astro
│   │   │
│   │   └── product/            # Componentes de producto
│   │       ├── AddToCartButton.tsx  # ⚛️ Isla React
│   │       ├── ProductCard.astro
│   │       └── ProductGallery.tsx   # ⚛️ Isla React
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro    # Layout público (tienda)
│   │   └── AdminLayout.astro   # Layout admin (backoffice)
│   │
│   ├── lib/
│   │   ├── stores/             # Nano Stores
│   │   │   ├── cart.ts         # Estado del carrito
│   │   │   ├── ui.ts           # Estado UI global
│   │   │   └── index.ts
│   │   │
│   │   └── supabase/           # Clientes de Supabase
│   │       ├── client.ts       # Cliente público (anon key)
│   │       ├── server.ts       # Cliente admin (service role)
│   │       └── database.types.ts
│   │
│   ├── pages/
│   │   ├── index.astro         # Homepage (SSG)
│   │   ├── tienda.astro        # Catálogo completo (SSG)
│   │   ├── login.astro         # Login admin (SSR)
│   │   │
│   │   ├── categoria/
│   │   │   └── [slug].astro    # Páginas por categoría (SSG)
│   │   │
│   │   ├── producto/
│   │   │   └── [slug].astro    # Ficha de producto (SSG)
│   │   │
│   │   ├── admin/              # Panel de administración (SSR)
│   │   │   ├── index.astro     # Dashboard
│   │   │   └── productos/
│   │   │       ├── index.astro # Listado productos
│   │   │       └── nuevo.astro # Crear producto
│   │   │
│   │   └── api/
│   │       └── auth/
│   │           ├── login.ts    # Endpoint login
│   │           └── logout.ts   # Endpoint logout
│   │
│   ├── styles/
│   │   └── global.css          # Tailwind + Theme tokens
│   │
│   └── env.d.ts                # Tipos de env vars
│
├── supabase/
│   └── schema.sql              # Esquema de base de datos
│
├── .env                        # Variables de entorno (local)
├── .env.example                # Template de variables de entorno
├── astro.config.mjs            # Configuración de Astro
├── package.json
└── tsconfig.json
```

## ⚡ Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Copia `.env.example` a `.env` y rellena las credenciales:

```env
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

3. Ejecuta el esquema SQL en Supabase:
   - Ve a **SQL Editor** en tu proyecto
   - Pega el contenido de `supabase/schema.sql`
   - Ejecuta el script

### 3. Configurar Storage

1. Ve a **Storage** en Supabase
2. Crea un bucket llamado `products-images`
3. En la configuración del bucket:
   - **Public bucket**: ✅ Activado
4. Añade estas políticas RLS:

```sql
-- Política de lectura pública
CREATE POLICY "Imágenes públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'products-images');

-- Política de subida para autenticados
CREATE POLICY "Admins pueden subir imágenes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products-images');

-- Política de eliminación para autenticados
CREATE POLICY "Admins pueden eliminar imágenes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products-images');
```

### 4. Crear usuario administrador

1. Ve a **Authentication > Users** en Supabase
2. Click en **Add user**
3. Crea un usuario con email y contraseña

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

- Tienda: http://localhost:4321
- Admin: http://localhost:4321/admin/acceso-seguro (login requerido)

## 🎨 Sistema de Diseño

### Paleta de Colores

| Token | Hex | Uso |
|-------|-----|-----|
| `navy-900` | `#0a1628` | Texto principal, botones |
| `charcoal-800` | `#2d2d2d` | Texto secundario |
| `ivory` | `#faf9f7` | Fondo principal |
| `cream` | `#f5f3ef` | Fondo secundario |
| `leather` | `#8b5a2b` | Acentos premium |
| `gold-matte` | `#b8a067` | Detalles dorados |

### Tipografías

- **Serif**: Playfair Display (títulos)
- **Sans**: Inter (cuerpo de texto)

### Clases Utilitarias

```css
.btn-primary      /* Botón principal navy */
.btn-secondary    /* Botón con borde */
.btn-accent       /* Botón leather */
.input-elegant    /* Input con estilo */
.select-elegant   /* Select con estilo */
.product-card     /* Card de producto */
.container-custom /* Contenedor max-w-7xl */
```

## 🛒 Carrito (Nano Stores)

### Uso desde componentes React

```tsx
import { useStore } from '@nanostores/react';
import { cartItems, cartCount, addToCart } from '@/lib/stores/cart';

function MyComponent() {
  const items = useStore(cartItems);
  const count = useStore(cartCount);
  
  // Añadir producto
  addToCart(product, 'M', 1);
}
```

### Funciones disponibles

| Función | Descripción |
|---------|-------------|
| `addToCart(product, size, qty)` | Añade producto al carrito |
| `removeFromCart(productId, size)` | Elimina item |
| `updateQuantity(productId, size, qty)` | Actualiza cantidad |
| `clearCart()` | Vacía el carrito |
| `openCart()` / `closeCart()` | Controla el slide-over |
| `formatPrice(cents)` | Formatea precio a euros |

## 📦 Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run astro ...` | Comandos de Astro CLI |

## 🔐 Seguridad

- **RLS habilitado** en todas las tablas
- **Cookies HttpOnly** para tokens de auth
- **Service Role Key** solo en el servidor
- **Bucket público** solo para lectura

## 📄 Licencia

MIT © FashionMarket
