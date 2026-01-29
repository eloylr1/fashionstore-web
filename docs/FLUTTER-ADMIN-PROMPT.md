# PROMPT PROFESIONAL: Panel de Administracion Flutter - FASHIONMARKET

## Contexto del Proyecto

Estoy desarrollando una **aplicacion Flutter** que sirva como panel de administracion movil/tablet para mi e-commerce **FASHIONMARKET**. El backend ya esta completo y funcionando con **Supabase** como base de datos. La version web (Astro + React) ya esta en produccion en https://eloyfashionstore.victoriafp.online.

**IMPORTANTE**: Este proyecto Flutter debe conectarse a la **MISMA base de datos Supabase** que usa la version web. No necesitas crear tablas ni esquemas - ya existen. Solo necesitas implementar la UI y la logica de conexion.

---

## ESQUEMA DE BASE DE DATOS COMPLETO

### ENUMs Definidos

```sql
-- Rol de usuario
CREATE TYPE user_role AS ENUM ('admin', 'customer');

-- Estados de pedido
CREATE TYPE order_status AS ENUM (
  'pending',      -- Esperando pago
  'paid',         -- Pagado, pendiente de procesar
  'processing',   -- En preparacion
  'shipped',      -- Enviado
  'delivered',    -- Entregado
  'cancelled',    -- Cancelado
  'refunded'      -- Reembolsado
);

-- Estados de devolucion
CREATE TYPE return_status AS ENUM (
  'requested',    -- Solicitada
  'approved',     -- Aprobada
  'in_transit',   -- En transito de vuelta
  'received',     -- Recibida
  'refunded',     -- Reembolsada
  'rejected'      -- Rechazada
);

-- Tipos de descuento
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
```

---

### Tabla: profiles (Usuarios)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'customer',
  avatar_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Espana',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Notas Flutter**:
- El admin solo ve clientes donde `role != 'admin'`
- El `id` es UUID de Supabase Auth
- Hay trigger automatico que crea perfil al registrarse

---

### Tabla: categories (Categorias de productos)
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: products (Productos)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,        -- PRECIO EN CENTIMOS (29900 = 299.00 EUR)
  stock INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  images TEXT[],                 -- Array de URLs de Cloudinary
  sizes TEXT[],                  -- ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  colors TEXT[],                 -- ['Negro', 'Azul marino']
  material TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**MUY IMPORTANTE - PRECIOS EN CENTIMOS**:
```dart
// Para mostrar: centimos a euros
String formatPrice(int cents) {
  return '${(cents / 100).toStringAsFixed(2)} EUR';
}
// 29900 -> "299.00 EUR"

// Para guardar: euros a centimos
int eurosToCents(double euros) {
  return (euros * 100).round();
}
// 299.00 -> 29900
```

---

### Tabla: orders (Pedidos)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,  -- Formato: "FM-2025-000001"
  user_id UUID REFERENCES profiles(id),
  status order_status DEFAULT 'pending',
  
  -- Direccion de envio
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'Espana',
  shipping_phone TEXT,
  
  -- Totales (TODO EN CENTIMOS)
  subtotal INTEGER DEFAULT 0,
  shipping_cost INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  
  -- Pago
  payment_method TEXT,           -- 'stripe', 'transfer', 'cash_on_delivery'
  stripe_payment_intent_id TEXT,
  
  -- Envio
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Estados y colores sugeridos**:
```dart
Map<String, Color> statusColors = {
  'pending': Colors.amber,
  'paid': Colors.green,
  'processing': Colors.blue,
  'shipped': Colors.purple,
  'delivered': Colors.teal,
  'cancelled': Colors.red,
  'refunded': Colors.grey,
};

Map<String, String> statusLabels = {
  'pending': 'Pendiente',
  'paid': 'Pagado',
  'processing': 'Procesando',
  'shipped': 'Enviado',
  'delivered': 'Entregado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
};
```

---

### Tabla: order_items (Items de pedido)
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_slug TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  unit_price INTEGER NOT NULL,    -- CENTIMOS
  total_price INTEGER NOT NULL,   -- CENTIMOS (unit_price * quantity)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: returns (Devoluciones)
```sql
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number TEXT UNIQUE NOT NULL,  -- Formato: "RET-2025-000001"
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status return_status DEFAULT 'requested',
  reason TEXT NOT NULL,
  description TEXT,
  refund_amount INTEGER,          -- CENTIMOS
  refund_method TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: return_items (Items de devolucion)
```sql
CREATE TABLE return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: addresses (Direcciones guardadas)
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Casa',
  full_name TEXT NOT NULL,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'Espana',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: wishlist (Lista de deseos)
```sql
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

---

### Tabla: invoices (Facturas)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES profiles(id),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_postal_code TEXT,
  customer_country TEXT,
  customer_tax_id TEXT,
  company_name TEXT,
  company_address TEXT,
  company_tax_id TEXT,
  subtotal INTEGER NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 21.00,
  tax_amount INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'issued',
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  items JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: discount_codes (Codigos de descuento)
```sql
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type discount_type NOT NULL,
  value INTEGER NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  min_order_amount INTEGER,
  max_discount_amount INTEGER,
  first_purchase_only BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: discount_code_redemptions (Usos de codigos)
```sql
CREATE TABLE discount_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id UUID NOT NULL REFERENCES discount_codes(id),
  user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  discount_amount INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code_id, user_id)
);
```

---

### Tabla: newsletter_subscriptions (Newsletter)
```sql
CREATE TABLE newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  promo_code TEXT,
  promo_delivered BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'website'
);
```

---

### Tabla: store_settings (Configuracion de tienda)
```sql
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category)
);
```

**Categorias de configuracion**:
```dart
// category: 'taxes'
{
  "tax_enabled": true,
  "tax_rate": 21,
  "tax_name": "IVA",
  "prices_include_tax": true,
  "tax_number": "B12345678",
  "show_tax_on_checkout": true
}

// category: 'payments'
{
  "stripe_enabled": true,
  "paypal_enabled": false,
  "transfer_enabled": true,
  "cash_on_delivery_enabled": false,
  "cod_extra_cost": 300,
  "currency": "EUR",
  "currency_symbol": "EUR"
}

// category: 'general'
{
  "store_name": "FashionMarket",
  "store_email": "info@fashionmarket.com",
  "store_phone": "+34 900 123 456",
  "store_address": "Calle Principal 123, Madrid"
}
```

---

### Tabla: shipping_methods (Metodos de envio)
```sql
CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,          -- CENTIMOS
  estimated_days INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  min_order_amount INTEGER,
  max_order_amount INTEGER,
  free_above INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## FUNCIONES DE BASE DE DATOS (RPC)

### Validar codigo de descuento
```sql
-- Llamar: supabase.rpc('validate_discount_code', { code_text, subtotal_cents, user_id_param })
-- Retorna: { valid, message, discount_amount, discount_type, discount_value, code_id }
```

### Cancelar pedido y restaurar stock
```sql
-- Llamar: supabase.rpc('cancel_order_and_restore_stock', { p_order_id })
-- Restaura automaticamente el stock de todos los productos del pedido
```

---

## FUNCIONALIDADES DEL PANEL ADMIN

### 1. Dashboard Principal
**KPIs a mostrar**:
- Ventas del mes: Suma de orders.total donde status IN ('paid', 'shipped', 'delivered')
- Pedidos pendientes: Count de orders donde status = 'pending'
- Producto mas vendido: Agrupar order_items por product_id, sumar quantity
- Grafico de ventas: Ultimos 7 dias

**Query ejemplo**:
```dart
final startOfMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
final response = await supabase
  .from('orders')
  .select('total')
  .gte('created_at', startOfMonth.toIso8601String())
  .inFilter('status', ['paid', 'shipped', 'delivered']);

int monthSales = response.fold(0, (sum, order) => sum + (order['total'] as int));
```

---

### 2. Gestion de Productos
**Funcionalidades**:
- Listar productos con busqueda y filtros
- Crear nuevo producto
- Editar producto existente
- Eliminar producto (con confirmacion)
- Filtrar por categoria
- Ver productos sin stock / stock bajo

**Campos del formulario**:
- Nombre (requerido)
- Slug (auto-generado, editable)
- Descripcion
- Precio (mostrar en EUR, guardar en centimos)
- Stock (numero entero)
- Categoria (dropdown)
- Imagenes (multiples, subir a Cloudinary)
- Tallas (multi-select)
- Colores (input con chips)
- Material
- Destacado (checkbox)

---

### 3. Gestion de Stock
**Vista rapida para ajustar stock**:
- Lista de productos con stock actual
- Filtros: Todos / Stock bajo (1-5) / Sin stock (0)
- Ajuste rapido de stock (+/- buttons o input directo)
- Busqueda por nombre

---

### 4. Gestion de Categorias
**CRUD completo**:
- Nombre
- Slug (auto-generado desde nombre)
- Descripcion
- Imagen (Cloudinary)

**Funcion para generar slug**:
```dart
String generateSlug(String name) {
  return name
    .toLowerCase()
    .replaceAll(RegExp(r'[aeiou]'), 'a')
    .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
    .replaceAll(RegExp(r'^-|-$'), '');
}
```

---

### 5. Gestion de Pedidos
**Lista de pedidos**:
- Filtrar por estado
- Buscar por numero de pedido o cliente
- Ordenar por fecha (mas recientes primero)

**Detalle de pedido**:
- Info del cliente (nombre, email, telefono)
- Direccion de envio completa
- Items del pedido (con imagen, nombre, talla, color, cantidad, precio)
- Totales (subtotal, envio, descuento, impuestos, total)
- Cambiar estado (dropdown con los 7 estados)
- Anadir numero de tracking
- Notas internas

**Transiciones de estado validas**:
```dart
Map<String, List<String>> validTransitions = {
  'pending': ['paid', 'cancelled'],
  'paid': ['processing', 'refunded', 'cancelled'],
  'processing': ['shipped', 'cancelled'],
  'shipped': ['delivered'],
  'delivered': [],
  'cancelled': [],
  'refunded': [],
};
```

**Query para lista de pedidos**:
```dart
final orders = await supabase
  .from('orders')
  .select('*, profiles!user_id (full_name, email)')
  .order('created_at', ascending: false);
```

**Query para detalle con items**:
```dart
final order = await supabase
  .from('orders')
  .select('*, profiles!user_id (id, full_name, email, phone)')
  .eq('id', orderId)
  .single();

final items = await supabase
  .from('order_items')
  .select('*, products (id, name, slug, images)')
  .eq('order_id', orderId);
```

---

### 6. Gestion de Clientes
**Lista de clientes** (donde role != 'admin'):
- Total clientes
- Nuevos ultimos 30 dias
- Buscar por nombre/email
- Ver perfil completo
- Ver historial de pedidos del cliente

---

### 7. Promociones / Codigos de Descuento
**CRUD de codigos**:
- Codigo (texto unico, uppercase recomendado)
- Tipo: Porcentaje / Cantidad fija
- Valor
- Descripcion
- Activo (toggle)
- Maximo de usos (opcional)
- Pedido minimo (opcional)
- Descuento maximo (opcional)
- Solo primera compra (checkbox)
- Fecha expiracion (opcional)

**Stats mostradas**:
- Total codigos
- Activos
- Usos totales
- Expirados

---

### 8. Metodos de Envio
**CRUD de metodos**:
- Nombre
- Descripcion
- Coste (en euros, guardar centimos)
- Dias estimados
- Icono: 'standard', 'express', 'same_day', 'pickup'
- Habilitado (toggle)
- Por defecto (solo uno puede ser default)
- Gratis desde (opcional)

---

### 9. Configuracion de Pagos
**Toggles para**:
- Stripe (tarjetas)
- PayPal
- Transferencia bancaria
- Contrareembolso (+coste extra)

---

### 10. Configuracion de Impuestos
**Campos**:
- Impuesto habilitado (toggle)
- Nombre del impuesto (ej: "IVA")
- Porcentaje (ej: 21)
- Precios incluyen impuesto (checkbox)
- NIF/CIF de la empresa

---

### 11. Configuracion General
**Datos de la tienda**:
- Nombre de la tienda
- CIF/NIF de la empresa
- Email de contacto
- Telefono
- Direccion completa
- Descripcion de la tienda
- Redes sociales (Instagram, Facebook, TikTok)

---

### 12. Sistema de Notificaciones
**Tipos de notificaciones automaticas**:

1. **Pedidos (type: 'order')**:
   - Nuevo pedido recibido
   - Pedido pagado
   - Pedido enviado

2. **Stock (type: 'stock')**:
   - Producto con stock bajo (< 10 unidades)
   - Producto sin stock (= 0)

3. **Clientes (type: 'customer')**:
   - Nuevo cliente registrado

**Estructura de notificacion**:
```dart
class AdminNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final DateTime timestamp;
  final String? link;
  bool isRead;
}
```

**Funcionalidades**:
- Badge con contador de no leidas
- Marcar como leida al hacer tap
- Marcar todas como leidas
- Filtrar por tipo
- Auto-actualizacion cada 2 minutos

---

### 13. Busqueda Global
**Busca en**:
- Productos (por nombre)
- Pedidos (por numero o ID)
- Clientes (por nombre o email)

**Busquedas especiales (keywords)**:
```dart
Map<String, Function> specialSearches = {
  'stock bajo': () => getProductsWithLowStock(),
  'sin stock': () => getProductsOutOfStock(),
  'pedidos pendientes': () => getOrdersByStatus('pending'),
  'procesando': () => getOrdersByStatus('processing'),
  'enviados': () => getOrdersByStatus('shipped'),
  'destacados': () => getFeaturedProducts(),
  'clientes': () => getAllCustomers(),
};
```

---

### 14. Exportacion de Reportes
**Formatos disponibles**:
- Excel (.xlsx)
- PDF
- Email (envio directo)

**Datos incluidos en el reporte**:
- KPIs del mes
- Ventas por dia
- Top productos
- Pedidos recientes

---

### 15. Perfil del Administrador
**Datos editables**:
- Nombre completo
- Telefono
- Contrasena (cambio)

**Datos de solo lectura**:
- Email
- Fecha de registro
- Ultimo acceso

---

## GESTION DE IMAGENES (Cloudinary)

**Cloud name**: dfd2imbfs

**Para Flutter**, puedes usar el paquete cloudinary_public:
```dart
final cloudinary = CloudinaryPublic('dfd2imbfs', 'YOUR_UPLOAD_PRESET', cache: false);
final response = await cloudinary.uploadFile(
  CloudinaryFile.fromFile(file.path, folder: 'fashion-store/products')
);
String imageUrl = response.secureUrl;
```

---

## AUTENTICACION

**Supabase Auth** maneja la autenticacion. El admin debe:
1. Iniciar sesion con email/password
2. Verificar que profiles.role = 'admin'
3. Si no es admin, denegar acceso

```dart
final response = await supabase.auth.signInWithPassword(
  email: email,
  password: password,
);

final profile = await supabase
  .from('profiles')
  .select('role')
  .eq('id', response.user!.id)
  .single();

if (profile['role'] != 'admin') {
  throw Exception('Acceso denegado: no eres administrador');
}
```

---

## ESTRUCTURA SUGERIDA FLUTTER

```
lib/
  main.dart
  app.dart
  config/
    supabase_config.dart
    theme.dart
    constants.dart
  models/
    product.dart
    category.dart
    order.dart
    order_item.dart
    customer.dart
    discount_code.dart
    shipping_method.dart
    store_settings.dart
    notification.dart
  services/
    auth_service.dart
    products_service.dart
    orders_service.dart
    categories_service.dart
    customers_service.dart
    discounts_service.dart
    shipping_service.dart
    settings_service.dart
    notifications_service.dart
    analytics_service.dart
    search_service.dart
    cloudinary_service.dart
  providers/
    auth_provider.dart
    products_provider.dart
    orders_provider.dart
    notifications_provider.dart
  screens/
    splash_screen.dart
    login_screen.dart
    dashboard/
      dashboard_screen.dart
    products/
      products_list_screen.dart
      product_form_screen.dart
      stock_screen.dart
    orders/
      orders_list_screen.dart
      order_detail_screen.dart
    categories/
      categories_screen.dart
      category_form_screen.dart
    customers/
      customers_screen.dart
      customer_detail_screen.dart
    promotions/
      promotions_screen.dart
      discount_form_screen.dart
    shipping/
      shipping_screen.dart
      shipping_form_screen.dart
    settings/
      settings_screen.dart
      payments_screen.dart
      taxes_screen.dart
      profile_screen.dart
    notifications/
      notifications_screen.dart
  widgets/
    common/
      app_drawer.dart
      loading_widget.dart
      error_widget.dart
      empty_state.dart
      confirm_dialog.dart
      toast_widget.dart
    dashboard/
      kpi_card.dart
      sales_chart.dart
    products/
      product_card.dart
      image_uploader.dart
      stock_badge.dart
    orders/
      order_card.dart
      status_badge.dart
      status_dropdown.dart
    notifications/
      notification_badge.dart
      notification_tile.dart
  utils/
    formatters.dart
    validators.dart
    slug_generator.dart
```

---

## TEMA Y COLORES

**Paleta usada en la web**:
```dart
const navy900 = Color(0xFF1A237E);
const navy700 = Color(0xFF303F9F);
const charcoal600 = Color(0xFF546E7A);
const charcoal400 = Color(0xFF90A4AE);
const charcoal100 = Color(0xFFECEFF1);

const successGreen = Color(0xFF4CAF50);
const warningAmber = Color(0xFFFFC107);
const errorRed = Color(0xFFF44336);

ThemeData appTheme = ThemeData(
  primaryColor: navy900,
  colorScheme: ColorScheme.light(
    primary: navy900,
    secondary: navy700,
    error: errorRed,
  ),
  appBarTheme: AppBarTheme(
    backgroundColor: Colors.white,
    foregroundColor: navy900,
    elevation: 0,
  ),
);
```

---

## PAQUETES FLUTTER RECOMENDADOS

```yaml
dependencies:
  supabase_flutter: ^2.0.0
  flutter_riverpod: ^2.4.0
  go_router: ^12.0.0
  fl_chart: ^0.65.0
  cached_network_image: ^3.3.0
  flutter_slidable: ^3.0.1
  shimmer: ^3.0.0
  image_picker: ^1.0.4
  cloudinary_public: ^0.23.0
  intl: ^0.18.1
  url_launcher: ^6.2.0
  excel: ^4.0.0
  pdf: ^3.10.0
  printing: ^5.11.0
  share_plus: ^7.2.0
  shared_preferences: ^2.2.0
```

---

## CONSIDERACIONES IMPORTANTES

1. **PRECIOS SIEMPRE EN CENTIMOS** en la base de datos. Convertir al mostrar/guardar.

2. **Arrays PostgreSQL**: images, sizes, colors son TEXT[]. En Dart seran List<String>.

3. **JSONB**: store_settings.settings es JSONB. En Dart sera Map<String, dynamic>.

4. **UUIDs**: Todos los IDs son UUID v4 generados por PostgreSQL.

5. **Timestamps**: Usa DateTime.parse() para los campos TIMESTAMPTZ.

6. **RLS (Row Level Security)**: Las politicas ya estan configuradas. El admin tiene acceso completo.

7. **Soft deletes**: No hay soft delete implementado. Los DELETE son permanentes.

8. **Orden por defecto**: Casi todo se ordena por created_at DESC.

9. **Generacion de numeros**:
   - Pedidos: FM-2025-000042 (auto-generado)
   - Devoluciones: RET-2025-000001 (auto-generado)
   - Facturas: FM-2025-000001 (auto-generado)

10. **Tallas dinamicas por categoria**:
```dart
Map<String, List<String>> sizesByCategory = {
  'ropa': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'pantalones': ['46', '48', '50', '52', '54', '56'],
  'zapatos': ['39', '40', '41', '42', '43', '44', '45'],
  'calcetines': ['39-42', '43-46'],
  'cinturones': ['85', '90', '95', '100', '105', '110'],
  'accesorios': ['Unica'],
};
```

---

## INICIO RAPIDO

```dart
// 1. Inicializar Supabase
await Supabase.initialize(
  url: 'TU_SUPABASE_URL',
  anonKey: 'TU_SUPABASE_ANON_KEY',
);

// 2. Obtener cliente
final supabase = Supabase.instance.client;

// 3. Ejemplo: Listar productos
final products = await supabase
  .from('products')
  .select('*, categories(name)')
  .order('created_at', ascending: false);

// 4. Ejemplo: Crear producto
await supabase.from('products').insert({
  'name': 'Camisa Oxford',
  'slug': 'camisa-oxford',
  'price': 4999,
  'stock': 25,
  'category_id': categoryId,
  'images': ['url1', 'url2'],
  'sizes': ['S', 'M', 'L'],
  'colors': ['Blanco', 'Azul'],
});

// 5. Ejemplo: Actualizar estado de pedido
await supabase
  .from('orders')
  .update({'status': 'shipped', 'tracking_number': 'ES123456789'})
  .eq('id', orderId);
```

---

## CONTACTO Y RECURSOS

- **Web en produccion**: https://eloyfashionstore.victoriafp.online
- **Panel admin web**: https://eloyfashionstore.victoriafp.online/admin
- **Supabase Dashboard**: (acceder con tus credenciales)

---

Este prompt contiene toda la informacion necesaria para desarrollar el panel de administracion Flutter. El esquema de base de datos ya existe y funciona - solo necesitas conectarte y crear la UI!
