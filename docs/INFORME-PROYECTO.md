# 📋 Informe del Proyecto - FashionMarket

**Estudiante:** Eloy López Ruiz  
**Fecha:** 13 de enero de 2026  
**Repositorio:** https://github.com/eloylr1/fashionstore-web.git

---

## 📝 Descripción del Proyecto

**FashionMarket** es una tienda online de moda masculina premium desarrollada como proyecto de e-commerce headless. La aplicación permite navegar por productos, añadirlos al carrito, gestionar pedidos y administrar el catálogo desde un panel de administración.

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Astro** | 5.16.7 | Framework principal (SSG + SSR) |
| **React** | 19.2.3 | Componentes interactivos (islas) |
| **Tailwind CSS** | 4.1.18 | Estilos y diseño responsive |
| **Nano Stores** | 1.1.0 | Gestión de estado (carrito) |
| **Supabase** | 2.90.0 | Base de datos + Autenticación + Storage |
| **Stripe** | 20.1.2 | Procesamiento de pagos (preparado) |
| **Node.js** | - | Adaptador para SSR |

---

## 📁 Estructura del Proyecto

```
FASHION-STORE/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── admin/           # Panel de administración
│   │   ├── cart/            # Carrito de compras
│   │   ├── checkout/        # Proceso de pago
│   │   ├── layout/          # Header y Footer
│   │   ├── product/         # Tarjetas y galería de productos
│   │   └── ui/              # Componentes UI genéricos
│   │
│   ├── layouts/             # Plantillas de página
│   │   ├── BaseLayout.astro
│   │   ├── PublicLayout.astro
│   │   └── AdminLayout.astro
│   │
│   ├── lib/                 # Lógica de negocio
│   │   ├── stores/          # Estado global (Nano Stores)
│   │   ├── supabase/        # Clientes de base de datos
│   │   └── utils.ts         # Funciones utilitarias
│   │
│   ├── pages/               # Rutas de la aplicación
│   │   ├── index.astro      # Página principal
│   │   ├── tienda.astro     # Catálogo de productos
│   │   ├── producto/        # Páginas de producto
│   │   ├── categoria/       # Páginas por categoría
│   │   ├── carrito.astro    # Carrito de compras
│   │   ├── checkout.astro   # Proceso de pago
│   │   ├── cuenta/          # Área de usuario
│   │   ├── admin/           # Panel de administración
│   │   └── api/             # Endpoints API
│   │
│   └── styles/
│       └── global.css       # Estilos globales + Tailwind
│
├── supabase/
│   ├── schema.sql           # Esquema de base de datos
│   └── schema-extended.sql  # Extensiones del esquema
│
└── docs/
    └── EMAIL-TEMPLATES.md   # Plantillas de email
```

---

## ✅ Funcionalidades Implementadas

### 🏠 Frontend Público

| Funcionalidad | Estado | Descripción |
|---------------|--------|-------------|
| **Homepage** | ✅ Completo | Hero section, productos destacados, categorías, newsletter |
| **Catálogo de productos** | ✅ Completo | Listado con filtros por categoría, precio y talla |
| **Ficha de producto** | ✅ Completo | Galería de imágenes, selector de talla, añadir al carrito |
| **Páginas por categoría** | ✅ Completo | Rutas dinámicas `/categoria/[slug]` |
| **Carrito de compras** | ✅ Completo | Slide-over panel, persistencia en localStorage |
| **Diseño responsive** | ✅ Completo | Mobile-first, adaptado a todos los dispositivos |

### 🛒 Sistema de Carrito (Nano Stores)

| Funcionalidad | Estado | Descripción |
|---------------|--------|-------------|
| Añadir productos | ✅ Completo | Con selección de talla y cantidad |
| Eliminar productos | ✅ Completo | Por item individual |
| Actualizar cantidades | ✅ Completo | Incremento/decremento |
| Persistencia | ✅ Completo | Guardado en localStorage |
| Cálculo de totales | ✅ Completo | Subtotal automático en tiempo real |
| Panel lateral | ✅ Completo | Slide-over con animación |

### 🔐 Panel de Administración

| Funcionalidad | Estado | Descripción |
|---------------|--------|-------------|
| Login de admin | ✅ Completo | Formulario con validación |
| Dashboard | ✅ Completo | Página principal del admin |
| Listado de productos | ✅ Completo | Tabla con acciones CRUD |
| Crear producto | ✅ Completo | Formulario completo |
| Sidebar de navegación | ✅ Completo | Menú lateral responsive |
| Layout administrativo | ✅ Completo | Separado del público |

### 👤 Área de Usuario

| Página | Estado | Descripción |
|--------|--------|-------------|
| `/cuenta` | ✅ Completo | Dashboard del usuario |
| `/cuenta/perfil` | ✅ Completo | Editar datos personales |
| `/cuenta/pedidos` | ✅ Completo | Historial de compras |
| `/cuenta/direcciones` | ✅ Completo | Gestión de direcciones |
| `/cuenta/pagos` | ✅ Completo | Métodos de pago |
| `/cuenta/favoritos` | ✅ Completo | Lista de deseos |
| `/cuenta/devoluciones` | ✅ Completo | Solicitar devoluciones |

### 🗄️ Base de Datos (Supabase)

| Tabla | Estado | Descripción |
|-------|--------|-------------|
| `profiles` | ✅ Diseñada | Usuarios con roles (admin/customer) |
| `categories` | ✅ Diseñada | Categorías de productos |
| `products` | ✅ Diseñada | Catálogo de productos |
| `orders` | ✅ Diseñada | Pedidos de clientes |
| `order_items` | ✅ Diseñada | Items de cada pedido |
| `wishlist` | ✅ Diseñada | Productos favoritos |

---

## 🔧 Componentes React (Islas Interactivas)

El proyecto utiliza el patrón **Islands Architecture** de Astro para optimizar el rendimiento:

| Componente | Ubicación | Funcionalidad |
|------------|-----------|---------------|
| `CartSlideOver.tsx` | `/components/cart/` | Panel lateral del carrito |
| `CartButton.tsx` | `/components/cart/` | Icono del carrito con contador |
| `AddToCartButton.tsx` | `/components/product/` | Botón añadir al carrito |
| `ProductGallery.tsx` | `/components/product/` | Galería de imágenes con zoom |
| `ImageUploader.tsx` | `/components/admin/` | Drag & drop de imágenes |
| `CheckoutForm.tsx` | `/components/checkout/` | Formulario de pago |

---

## 📚 Librerías de Utilidades

### Archivo: `src/lib/utils.ts`

Contiene **25+ funciones** organizadas en categorías:

```typescript
// Formateo de precios
formatPrice(cents)      // Céntimos a EUR formateado
formatCurrency(amount)  // Moneda personalizada

// Strings
slugify(text)           // Texto a URL-friendly
truncate(text, max)     // Truncar con "..."
capitalize(text)        // Primera letra mayúscula

// Fechas
formatDate(date)        // Fecha legible
timeAgo(date)           // "Hace 2 días"

// Arrays
groupBy(array, key)     // Agrupar por propiedad
unique(array)           // Elementos únicos

// Validación
isValidEmail(email)     // Validar email
isValidPhone(phone)     // Validar teléfono

// Utilidades
generateId()            // ID único
sleep(ms)               // Async delay
cn(...classes)          // Merge de clases CSS
```

---

## 🎨 Sistema de Diseño

### Paleta de Colores

| Token | Hex | Uso |
|-------|-----|-----|
| `navy-900` | `#0a1628` | Texto principal, botones |
| `charcoal-800` | `#2d2d2d` | Texto secundario |
| `ivory` | `#faf9f7` | Fondo principal |
| `cream` | `#f5f3ef` | Fondo secundario |
| `gold-matte` | `#b8a067` | Acentos premium |

### Tipografías

- **Títulos:** Playfair Display (serif)
- **Cuerpo:** Inter (sans-serif)

### Componentes UI

```css
.btn-primary      /* Botón principal */
.btn-secondary    /* Botón secundario */
.input-elegant    /* Campos de formulario */
.product-card     /* Tarjeta de producto */
.container-custom /* Contenedor max-w-7xl */
```

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Archivos totales** | 81+ |
| **Líneas de código** | ~18,900+ |
| **Páginas** | 20+ |
| **Componentes** | 15+ |
| **Funciones utilitarias** | 25+ |
| **Tablas de BD** | 6 |

---

## 🚀 Ejecución del Proyecto

### Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta en Supabase (opcional para demo)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/eloylr1/fashionstore-web.git
cd fashionstore-web

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run dev
```

### URLs en Desarrollo

| URL | Descripción |
|-----|-------------|
| http://localhost:4321 | Tienda pública |
| http://localhost:4321/tienda | Catálogo completo |
| http://localhost:4321/admin/acceso-seguro | Login de admin |
| http://localhost:4321/admin | Panel de administración |

---

## 🔄 Pendiente de Implementación

| Funcionalidad | Prioridad | Descripción |
|---------------|-----------|-------------|
| Conexión Supabase real | Alta | Desplegar schema.sql |
| Autenticación funcional | Alta | Integrar Supabase Auth |
| Pasarela de pago Stripe | Media | Procesar pagos reales |
| Envío de emails | Media | Confirmación de pedidos |
| Tests automatizados | Baja | Unit + Integration tests |

---

## 📌 Notas Técnicas

1. **El proyecto funciona con datos demo** - No requiere configurar Supabase para visualizar la tienda
2. **Arquitectura Islands** - Solo los componentes interactivos (React) cargan JavaScript
3. **SSR selectivo** - Las páginas públicas son SSG, el admin usa SSR
4. **Estado persistente** - El carrito se guarda en localStorage

---

## 📎 Enlaces

- **Repositorio:** https://github.com/eloylr1/fashionstore-web.git
- **Documentación Astro:** https://docs.astro.build
- **Documentación Supabase:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

---

*Documento generado el 13 de enero de 2026*
