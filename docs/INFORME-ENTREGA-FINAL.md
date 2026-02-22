# FashionMarket - Informe de Entrega Final

**Estudiante:** Eloy López Ruiz  
**Fecha:** 22 de febrero de 2026  
**Repositorio:** https://github.com/eloylr1/fashionstore-web.git

---

## ¿Qué es FashionMarket?

FashionMarket es una **tienda online de moda masculina premium** completamente funcional. El proyecto simula un e-commerce real donde los clientes pueden:

- Navegar por el catálogo de productos
- Añadir artículos al carrito
- Realizar compras con tarjeta de crédito
- Gestionar su cuenta, pedidos y devoluciones
- Recibir facturas y confirmaciones por email

Además, incluye un **panel de administración** donde el dueño de la tienda puede gestionar todo el negocio.

---

## Funcionalidades Principales

### 🛒 Tienda Online (Cara Pública)

| Función | Descripción |
|---------|-------------|
| **Página de inicio** | Hero animado, productos destacados, categorías, testimonios y newsletter |
| **Catálogo de productos** | Listado con filtros por categoría, precio, talla y color |
| **Ficha de producto** | Galería de imágenes, selector de talla, descripción y botón de compra |
| **Carrito de compras** | Panel lateral que aparece al añadir productos, con resumen y totales |
| **Checkout** | Proceso de compra en 3 pasos: Envío → Pago → Confirmación |
| **Buscador** | Búsqueda de productos en tiempo real |

### 👤 Área de Usuario (Mi Cuenta)

| Sección | Qué puede hacer el cliente |
|---------|---------------------------|
| **Mi perfil** | Editar nombre, email, teléfono y foto |
| **Mis pedidos** | Ver historial de compras con estado y seguimiento |
| **Mis direcciones** | Guardar varias direcciones de envío |
| **Métodos de pago** | Guardar tarjetas para compras rápidas |
| **Favoritos** | Lista de deseos con productos guardados |
| **Mis facturas** | Descargar facturas en PDF |
| **Devoluciones** | Solicitar devolución de productos |

### 🔐 Panel de Administración

El administrador tiene control total sobre la tienda:

| Sección | Funcionalidad |
|---------|---------------|
| **Dashboard** | Gráficos de ventas, pedidos del día, productos más vendidos |
| **Productos** | Crear, editar, eliminar productos con imágenes |
| **Categorías** | Gestionar las secciones de la tienda |
| **Pedidos** | Ver y actualizar estado de pedidos |
| **Clientes** | Listado de usuarios registrados |
| **Stock** | Control de inventario y alertas de stock bajo |
| **Promociones** | Crear códigos de descuento y ofertas |
| **Envíos** | Configurar métodos y costes de envío |
| **Impuestos** | Gestionar IVA y otros impuestos |
| **Devoluciones** | Procesar solicitudes de devolución |
| **Configuración** | Datos de la tienda, logo, políticas |
| **Exportar** | Descargar informes en Excel y PDF |

---

## Características Técnicas Destacadas

### Pagos con Tarjeta
La tienda acepta pagos con tarjeta de crédito/débito usando **Stripe**, una pasarela de pagos profesional. El cliente puede pagar de forma segura y sus datos bancarios nunca pasan por nuestro servidor.

### Emails Automáticos
El sistema envía emails automáticamente cuando:
- Un cliente se registra (bienvenida)
- Se realiza un pedido (confirmación)
- Cambia el estado del pedido (envío, entrega)
- Se procesa una devolución

### Facturas en PDF
Cada compra genera automáticamente una factura en PDF con:
- Datos del cliente y la tienda
- Desglose de productos
- Impuestos (IVA)
- Número de factura único

### Sistema de Descuentos
- Códigos promocionales (ej: "VERANO20" = 20% descuento)
- Descuento del 10% para nuevos suscriptores
- Ofertas especiales y rebajas

### Responsive (Se ve bien en móvil)
La web se adapta automáticamente a cualquier pantalla:
- Móviles
- Tablets
- Ordenadores de escritorio

---

## Páginas de la Web

### Páginas Públicas
| URL | Descripción |
|-----|-------------|
| `/` | Página de inicio con hero, productos y newsletter |
| `/tienda` | Catálogo completo con filtros |
| `/producto/[nombre]` | Ficha detallada del producto |
| `/categoria/[nombre]` | Productos de una categoría |
| `/carrito` | Página del carrito de compras |
| `/checkout` | Proceso de pago (3 pasos) |
| `/login` | Iniciar sesión |
| `/registro` | Crear cuenta nueva |
| `/ayuda` | Preguntas frecuentes |
| `/seguimiento` | Seguimiento de pedidos |
| `/privacidad` | Política de privacidad |
| `/terminos` | Términos y condiciones |

### Área de Usuario (requiere login)
| URL | Descripción |
|-----|-------------|
| `/cuenta` | Panel principal del usuario |
| `/cuenta/perfil` | Editar datos personales |
| `/cuenta/pedidos` | Historial de compras |
| `/cuenta/direcciones` | Gestionar direcciones |
| `/cuenta/pagos` | Métodos de pago guardados |
| `/cuenta/favoritos` | Lista de deseos |
| `/cuenta/facturas` | Ver y descargar facturas |
| `/cuenta/devoluciones` | Solicitar devoluciones |

### Panel Admin (solo administradores)
| URL | Descripción |
|-----|-------------|
| `/admin` | Dashboard con métricas |
| `/admin/productos` | Gestión de productos |
| `/admin/categorias` | Gestión de categorías |
| `/admin/pedidos` | Gestión de pedidos |
| `/admin/clientes` | Gestión de clientes |
| `/admin/stock` | Control de inventario |
| `/admin/promociones` | Códigos descuento |
| `/admin/envios` | Métodos de envío |
| `/admin/impuestos` | Configuración IVA |
| `/admin/devoluciones` | Procesar devoluciones |
| `/admin/configuracion` | Ajustes de la tienda |

---

## Tecnologías Utilizadas

### ¿Con qué está hecha la web?

| Tecnología | Para qué se usa |
|------------|-----------------|
| **Astro** | El framework principal que genera las páginas web |
| **React** | Componentes interactivos (carrito, galerías, formularios) |
| **Tailwind CSS** | Estilos y diseño visual de toda la web |
| **TypeScript** | JavaScript con tipos para evitar errores |

### ¿Dónde se guardan los datos?

| Servicio | Función |
|----------|---------|
| **Supabase** | Base de datos PostgreSQL + autenticación de usuarios |
| **Cloudinary** | Almacenamiento de imágenes de productos |
| **Stripe** | Procesamiento de pagos con tarjeta |

### ¿Cómo se envían los emails?

| Servicio | Función |
|----------|---------|
| **Nodemailer + Gmail** | Envío de emails transaccionales |

---

## Justificación de Tecnologías

### ¿Por qué elegimos cada tecnología?

#### Astro 5.0 - Framework Principal
| Característica | Beneficio |
|----------------|-----------|
| **Islands Architecture** | Solo carga JavaScript donde es necesario, el resto es HTML puro |
| **SSG + SSR híbrido** | Páginas estáticas ultra-rápidas para la tienda, dinámicas para el admin |
| **Zero JS by default** | Tienda rápida = mejor SEO y experiencia de usuario |
| **Integración con React** | Podemos usar React solo para partes interactivas |

**Alternativas descartadas:**
- Next.js: Demasiado JavaScript para una tienda que es mayormente estática
- WordPress + WooCommerce: Lento, difícil de personalizar, PHP legacy

#### React 19 - Componentes Interactivos
| Uso | Componente |
|-----|------------|
| Carrito de compras | `CartSlideOver.tsx` - Panel lateral reactivo |
| Galería de productos | `ProductGallery.tsx` - Zoom, thumbnails |
| Formulario de pago | `CheckoutForm.tsx` - Stripe Elements |
| Subida de imágenes | `ImageUploader.tsx` - Drag & drop |

**Por qué React y no Vue/Svelte:**
- Mayor ecosistema de librerías (Stripe React, etc.)
- Soporte nativo en Astro
- Conocimiento previo del equipo

#### Supabase - Backend as a Service
| Servicio | Qué proporciona |
|----------|-----------------|
| **PostgreSQL** | Base de datos relacional profesional |
| **Auth** | Login, registro, OAuth (Google) incluido |
| **Storage** | Almacenamiento de archivos (imágenes backup) |
| **Realtime** | Actualización en tiempo real del dashboard |
| **Row Level Security** | Seguridad a nivel de fila automática |

**Por qué Supabase y no Firebase:**
- PostgreSQL > NoSQL para e-commerce (relaciones complejas)
- SQL estándar, fácil de migrar si es necesario
- Tier gratuito muy generoso
- Open source

#### Stripe - Pasarela de Pagos
| Ventaja | Descripción |
|---------|-------------|
| **PCI Compliant** | No tocamos datos de tarjetas (cumplimos normativa) |
| **Stripe Elements** | Formularios de pago pre-construidos y seguros |
| **Webhooks** | Notificaciones automáticas de pagos |
| **Testing mode** | Podemos probar sin gastar dinero real |
| **Multi-moneda** | Preparado para internacionalización |

**Por qué Stripe y no PayPal:**
- Mejor experiencia de usuario (no redirige fuera)
- Comisiones más claras
- API más moderna y documentada

#### Tailwind CSS 4.0 - Estilos
| Ventaja | Descripción |
|---------|-------------|
| **Utility-first** | Desarrollo rápido sin salir del HTML |
| **Purge CSS** | Solo incluye los estilos que usamos |
| **Responsive** | Breakpoints fáciles (`md:`, `lg:`) |
| **Dark mode** | Preparado (aunque no activado) |

#### TypeScript - Tipado Estático
| Beneficio | Ejemplo |
|-----------|---------|
| **Evita errores** | No puedes pasar un string donde va un número |
| **Autocompletado** | El editor sugiere propiedades correctas |
| **Documentación viva** | Los tipos documentan el código |
| **Refactoring seguro** | Al cambiar algo, ves todos los sitios afectados |

---

## Base de Datos

La información se organiza en las siguientes tablas:

| Tabla | Información que guarda |
|-------|----------------------|
| `profiles` | Usuarios: nombre, email, teléfono, rol (admin/cliente) |
| `products` | Productos: nombre, precio, imágenes, tallas, stock |
| `categories` | Categorías: trajes, camisas, pantalones, etc. |
| `orders` | Pedidos: cliente, productos, total, dirección, estado |
| `order_items` | Productos de cada pedido: cantidad, talla, precio |
| `addresses` | Direcciones de envío guardadas |
| `payment_methods` | Tarjetas guardadas de los usuarios |
| `wishlist` | Productos favoritos de cada usuario |
| `invoices` | Facturas generadas |
| `credit_notes` | Notas de crédito por devoluciones |
| `discount_codes` | Códigos promocionales |
| `shipping_methods` | Métodos de envío disponibles |
| `newsletter_subscribers` | Suscriptores al boletín |

---

## Diagrama Entidad-Relación (ER)

El siguiente diagrama muestra cómo se relacionan las tablas de la base de datos:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           DIAGRAMA ENTIDAD-RELACIÓN                                  │
│                              FashionMarket E-commerce                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │   auth.users │          │   profiles   │          │  addresses   │
    │──────────────│          │──────────────│          │──────────────│
    │ PK: id       │─────────▶│ PK: id (FK)  │◀─────────│ FK: user_id  │
    │    email     │    1:1   │    email     │    1:N   │    label     │
    │    ...       │          │    full_name │          │    full_name │
    └──────────────┘          │    phone     │          │    address   │
           │                  │    role      │          │    city      │
           │                  └──────────────┘          │    is_default│
           │                         │                  └──────────────┘
           │                         │
           │                         │ 1:N
           │                         ▼
           │        ┌────────────────────────────────┐
           │        │            orders              │
           │        │────────────────────────────────│
           │        │ PK: id                         │
           ├───────▶│ FK: user_id                    │
           │   1:N  │    order_number                │
           │        │    status (pending/paid/...)   │
           │        │    shipping_address            │
           │        │    subtotal, tax, total        │
           │        │    stripe_payment_intent_id    │
           │        └────────────────────────────────┘
           │                    │           │
           │                    │ 1:N       │ 1:1
           │                    ▼           ▼
           │        ┌──────────────┐   ┌──────────────┐
           │        │ order_items  │   │   invoices   │
           │        │──────────────│   │──────────────│
           │        │ PK: id       │   │ PK: id       │
           │        │ FK: order_id │   │ FK: order_id │
           │        │ FK: product  │   │ FK: user_id  │
           │        │    quantity  │   │ invoice_number│
           │        │    size      │   │    subtotal  │
           │        │    unit_price│   │    tax_amount│
           │        └──────────────┘   │    total     │
           │               │           │    items JSON│
           │               │           └──────────────┘
           │               │                   │
           │               │                   │ 1:N
           │               │                   ▼
           │               │           ┌──────────────┐
           │               │           │ credit_notes │
           │               │           │──────────────│
           │               │           │ PK: id       │
           │               │           │ FK: invoice  │
           │               │           │ FK: order_id │
           │               │           │    reason    │
           │               │           │    total     │
           │               │           └──────────────┘
           │               │
           │               ▼
           │        ┌──────────────┐
           │        │   products   │◀───────────┐
           │        │──────────────│            │
           │        │ PK: id       │            │
           │        │ FK: category │            │
           │        │    name      │            │
           │        │    slug      │            │
           │        │    price     │      ┌──────────────┐
           │        │    stock     │      │  categories  │
           │        │    images[]  │      │──────────────│
           │        │    sizes[]   │      │ PK: id       │
           │        │    featured  │◀─────│    name      │
           │        └──────────────┘ N:1  │    slug      │
           │               │              │    image_url │
           │               │              └──────────────┘
           │               │ N:M
           │               ▼
           │        ┌──────────────┐
           ├───────▶│   wishlist   │
           │   1:N  │──────────────│
           │        │ FK: user_id  │
           │        │ FK: product  │
           │        └──────────────┘
           │
           │        ┌──────────────┐
           ├───────▶│payment_methods│
           │   1:N  │──────────────│
           │        │ FK: user_id  │
           │        │    type      │
           │        │    last_four │
           │        │    brand     │
           │        │ stripe_pm_id │
           │        └──────────────┘
           │
           │        ┌──────────────┐          ┌──────────────┐
           │        │   returns    │          │ return_items │
           └───────▶│──────────────│─────────▶│──────────────│
              1:N   │ FK: user_id  │   1:N    │ FK: return_id│
                    │ FK: order_id │          │ FK: order_item│
                    │    status    │          │    quantity  │
                    │    reason    │          └──────────────┘
                    │refund_amount │
                    └──────────────┘


    ┌──────────────┐          ┌──────────────┐
    │discount_codes│          │shipping_methods│
    │──────────────│          │──────────────│
    │ PK: id       │          │ PK: id       │
    │    code      │          │    name      │
    │    type      │          │    base_cost │
    │    value     │          │free_threshold│
    │    min_order │          │    active    │
    │    max_uses  │          └──────────────┘
    │    expires_at│
    └──────────────┘

    ┌──────────────────────┐
    │newsletter_subscribers│
    │──────────────────────│
    │ PK: id               │
    │    email             │
    │    discount_code     │
    │    subscribed_at     │
    └──────────────────────┘


╔═══════════════════════════════════════════════════════════════════════════╗
║  LEYENDA:                                                                  ║
║  ─────────────────────────────────────────────────────────────────────────║
║  PK = Primary Key (Clave Primaria)                                         ║
║  FK = Foreign Key (Clave Foránea)                                          ║
║  1:1 = Relación uno a uno                                                  ║
║  1:N = Relación uno a muchos                                               ║
║  N:M = Relación muchos a muchos                                            ║
║  ──▶  = Dirección de la relación                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### Relaciones Principales

| Relación | Tipo | Descripción |
|----------|------|-------------|
| auth.users → profiles | 1:1 | Cada usuario tiene un perfil con datos adicionales |
| profiles → orders | 1:N | Un usuario puede tener muchos pedidos |
| orders → order_items | 1:N | Un pedido tiene muchos productos |
| orders → invoices | 1:1 | Cada pedido genera una factura |
| invoices → credit_notes | 1:N | Una factura puede tener notas de crédito |
| products → categories | N:1 | Muchos productos pertenecen a una categoría |
| profiles → addresses | 1:N | Un usuario puede guardar varias direcciones |
| profiles → wishlist | 1:N | Un usuario puede tener muchos favoritos |
| profiles → returns | 1:N | Un usuario puede solicitar varias devoluciones |

---

## Flujo de Facturación

### ¿Cómo funciona el proceso de facturación?

El sistema genera facturas automáticamente siguiendo la normativa fiscal española:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE FACTURACIÓN                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    CLIENTE                    SISTEMA                         BASE DE DATOS
       │                          │                                  │
       │  1. Finaliza compra      │                                  │
       │─────────────────────────▶│                                  │
       │                          │                                  │
       │                          │  2. Procesa pago con Stripe      │
       │                          │─────────────────────────────────▶│
       │                          │                                  │
       │                          │  3. Crea pedido (orders)         │
       │                          │─────────────────────────────────▶│
       │                          │                                  │
       │                          │  4. Genera número de factura     │
       │                          │     FM-2026-000001               │
       │                          │─────────────────────────────────▶│
       │                          │                                  │
       │                          │  5. Calcula impuestos            │
       │                          │     Base: 82,64€                 │
       │                          │     IVA 21%: 17,36€              │
       │                          │     Total: 100,00€               │
       │                          │                                  │
       │                          │  6. Guarda factura (invoices)    │
       │                          │─────────────────────────────────▶│
       │                          │                                  │
       │                          │  7. Genera PDF de factura        │
       │                          │◀─────────────────────────────────│
       │                          │                                  │
       │  8. Envía email con PDF  │                                  │
       │◀─────────────────────────│                                  │
       │                          │                                  │
       ▼                          ▼                                  ▼
```

### Pasos del Proceso

| Paso | Acción | Descripción |
|------|--------|-------------|
| 1 | **Cliente completa checkout** | Introduce datos de envío y pago |
| 2 | **Stripe procesa el pago** | Valida tarjeta y cobra el importe |
| 3 | **Se crea el pedido** | Estado "paid", se guarda en `orders` |
| 4 | **Número de factura secuencial** | Formato: FM-YYYY-NNNNNN (ej: FM-2026-000042) |
| 5 | **Cálculo de impuestos** | Base imponible + IVA 21% = Total |
| 6 | **Factura guardada** | Se almacena en tabla `invoices` |
| 7 | **PDF generado** | Documento profesional con jsPDF |
| 8 | **Email enviado** | Confirmación + factura adjunta |

### Estructura de la Factura

Cada factura contiene:

| Sección | Datos |
|---------|-------|
| **Cabecera** | Logo, número de factura, fecha de emisión |
| **Vendedor** | FashionMarket S.L., NIF B12345678, dirección |
| **Cliente** | Nombre, NIF (opcional), dirección de facturación |
| **Detalle** | Productos, cantidad, talla, precio unitario, subtotal |
| **Totales** | Base imponible, IVA 21%, descuentos, **Total** |
| **Pie** | Método de pago, fecha de pago, estado |

### Numeración de Facturas

```
FM-2026-000001
│  │    │
│  │    └── Número secuencial (6 dígitos)
│  └─────── Año fiscal
└────────── Prefijo empresa (FashionMarket)
```

La numeración es **secuencial y única** dentro de cada año fiscal, cumpliendo con la normativa de facturación española.

### Notas de Crédito (Devoluciones)

Cuando se procesa una devolución:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE NOTA DE CRÉDITO (DEVOLUCIÓN)                    │
└─────────────────────────────────────────────────────────────────────────────┘

    CLIENTE                    SISTEMA                         STRIPE
       │                          │                               │
       │  1. Solicita devolución  │                               │
       │─────────────────────────▶│                               │
       │                          │                               │
       │                          │  2. Admin aprueba             │
       │                          │     devolución                │
       │                          │                               │
       │                          │  3. Procesa reembolso         │
       │                          │──────────────────────────────▶│
       │                          │                               │
       │                          │  4. Genera nota de crédito    │
       │                          │     NC-2026-000001            │
       │                          │     (referencia FM-2026-XXX)  │
       │                          │                               │
       │  5. Email con NC en PDF  │                               │
       │◀─────────────────────────│                               │
       │                          │                               │
       │  6. Reembolso en cuenta  │                               │
       │◀─────────────────────────│◀──────────────────────────────│
       │     (3-5 días)           │                               │
       ▼                          ▼                               ▼
```

La nota de crédito:
- Tiene un **número único**: NC-YYYY-NNNNNN
- **Referencia la factura original**
- Detalla los productos devueltos
- Incluye el importe a reembolsar
- Se envía por email al cliente

---

## Diseño Visual

### Colores de la marca
La tienda usa una paleta de colores elegante y profesional:

| Color | Uso |
|-------|-----|
| **Azul marino (#0a1628)** | Textos principales, botones, header |
| **Dorado mate (#b8a067)** | Acentos, elementos premium, CTAs |
| **Marfil (#faf9f7)** | Fondo principal |
| **Crema (#f5f3ef)** | Fondos secundarios, tarjetas |

### Tipografías
| Fuente | Uso |
|--------|-----|
| **Playfair Display** | Títulos - elegante y sofisticada |
| **Inter** | Textos - moderna y legible |

---

## Seguridad

El proyecto implementa varias medidas de seguridad:

- **Autenticación segura**: Los usuarios se registran y acceden con Supabase Auth
- **Contraseñas encriptadas**: Nunca se guardan en texto plano
- **Pagos seguros**: Stripe gestiona los datos bancarios (PCI compliant)
- **Protección de rutas**: Las páginas de admin solo son accesibles para administradores
- **Middleware de autenticación**: Verifica la sesión en cada petición protegida
- **Row Level Security**: La base de datos solo muestra a cada usuario sus propios datos

---

## Estructura del Proyecto

```
FASHION-STORE/
│
├── src/                    # Código fuente
│   ├── components/         # Piezas reutilizables de la web
│   │   ├── admin/          # Componentes del panel de admin
│   │   ├── cart/           # Carrito de compras
│   │   ├── checkout/       # Proceso de pago
│   │   ├── home/           # Página de inicio
│   │   ├── product/        # Tarjetas y galerías de productos
│   │   └── ui/             # Botones, inputs, etc.
│   │
│   ├── layouts/            # Plantillas de página
│   │   ├── BaseLayout.astro       # Layout base con SEO
│   │   ├── PublicLayout.astro     # Para la tienda
│   │   └── AdminLayout.astro      # Para el admin
│   │
│   ├── lib/                # Lógica de negocio
│   │   ├── email/          # Envío de emails
│   │   ├── pdf/            # Generación de facturas
│   │   ├── stripe/         # Integración con pagos
│   │   ├── supabase/       # Conexión a base de datos
│   │   └── stores/         # Estado global (carrito)
│   │
│   ├── pages/              # Todas las páginas de la web
│   │   ├── admin/          # Panel de administración
│   │   ├── api/            # Endpoints del servidor
│   │   ├── cuenta/         # Área de usuario
│   │   └── producto/       # Fichas de producto
│   │
│   └── styles/             # Estilos CSS
│
├── supabase/               # Esquemas de base de datos
│   ├── schema.sql          # Tablas principales
│   └── migrations/         # Cambios incrementales
│
├── public/                 # Archivos estáticos (favicon, etc.)
│
└── docs/                   # Documentación del proyecto
```

---

## Cómo ejecutar el proyecto

### Requisitos
- Node.js 18 o superior
- Cuenta en Supabase (gratuita)
- Cuenta en Stripe (modo test)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/eloylr1/fashionstore-web.git

# 2. Entrar en la carpeta
cd fashionstore-web

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
# Copiar .env.example a .env y rellenar las credenciales

# 5. Iniciar en modo desarrollo
npm run dev
```

La web estará disponible en: **http://localhost:4321**

---

## Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Archivos creados** | 100+ |
| **Líneas de código** | ~25,000+ |
| **Páginas** | 30+ |
| **Componentes** | 50+ |
| **Tablas de BD** | 15+ |
| **Endpoints API** | 25+ |
| **Migraciones SQL** | 20+ |

---

## Resumen de Funcionalidades

### ✅ Completado y Funcional

- [x] Tienda online completa con catálogo de productos
- [x] Sistema de carrito con persistencia
- [x] Checkout en 3 pasos con pagos reales (Stripe)
- [x] Registro e inicio de sesión de usuarios
- [x] Área de cuenta con perfil, pedidos, direcciones
- [x] Panel de administración completo
- [x] Gestión de productos, categorías y stock
- [x] Sistema de pedidos con estados
- [x] Generación de facturas en PDF
- [x] Emails transaccionales automáticos
- [x] Códigos de descuento y promociones
- [x] Sistema de favoritos (wishlist)
- [x] Solicitud de devoluciones
- [x] Newsletter con popup
- [x] Buscador de productos
- [x] Diseño responsive (móvil, tablet, escritorio)
- [x] SEO optimizado
- [x] Exportación de informes (Excel)

---

## Conclusiones

**FashionMarket** es un e-commerce completo que demuestra el dominio de tecnologías web modernas:

1. **Funcionalidad completa**: Cubre todo el ciclo de compra, desde navegar productos hasta recibir el pedido
2. **Experiencia de usuario cuidada**: Diseño elegante, responsive y fácil de usar
3. **Panel de administración potente**: El dueño de la tienda puede gestionar todo sin código
4. **Seguridad implementada**: Autenticación, pagos seguros, protección de datos
5. **Código mantenible**: Estructura clara, TypeScript y buenas prácticas
6. **Escalable**: Preparado para crecer con más productos y funcionalidades

El proyecto está listo para ser desplegado en producción y funcionar como una tienda real.

---

**Firma:** Eloy López Ruiz  
**Fecha:** 22 de febrero de 2026
