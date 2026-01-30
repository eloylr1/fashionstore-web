# PROMPT PROFESIONAL: Aplicación Cliente Flutter - FASHIONMARKET

## Contexto del Proyecto

Estoy desarrollando una **aplicación Flutter** que sirva como aplicación móvil de cliente para mi e-commerce **FASHIONMARKET**, una tienda de moda masculina premium especializada en trajes, camisas y accesorios elegantes. El backend ya está completo y funcionando con **Supabase** como base de datos. La versión web (Astro + React) ya está en producción en https://eloyfashionstore.victoriafp.online.

**IMPORTANTE**: Este proyecto Flutter debe conectarse a la **MISMA base de datos Supabase** que usa la versión web. No necesitas crear tablas ni esquemas - ya existen. Solo necesitas implementar la UI y la lógica de conexión.

---

## ESQUEMA DE BASE DE DATOS RELEVANTE PARA CLIENTE

### ENUMs Definidos

```sql
-- Rol de usuario
CREATE TYPE user_role AS ENUM ('admin', 'customer');

-- Estados de pedido
CREATE TYPE order_status AS ENUM (
  'pending',      -- Esperando pago
  'paid',         -- Pagado, pendiente de procesar
  'processing',   -- En preparación
  'shipped',      -- Enviado
  'delivered',    -- Entregado
  'cancelled',    -- Cancelado
  'refunded'      -- Reembolsado
);

-- Estados de devolución
CREATE TYPE return_status AS ENUM (
  'requested',    -- Solicitada
  'approved',     -- Aprobada
  'in_transit',   -- En tránsito de vuelta
  'received',     -- Recibida
  'refunded',     -- Reembolsada
  'rejected'      -- Rechazada
);

-- Tipos de descuento
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
```

---

### Tabla: profiles (Perfil de Usuario)
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
  country TEXT DEFAULT 'España',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Notas Flutter**:
- El cliente solo puede ver/editar su propio perfil
- El `id` es UUID de Supabase Auth (coincide con auth.users.id)
- Hay trigger automático que crea perfil al registrarse

---

### Tabla: categories (Categorías de productos)
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

**Categorías disponibles** (moda masculina):
- Trajes completos
- Trajes de chaqueta
- Americanas
- Chalecos de traje
- Pantalones de vestir
- Camisas
- Corbatas
- Pajaritas
- Gemelos
- Pañuelos de bolsillo
- Calcetines
- Cinturones
- Tirantes

---

### Tabla: products (Productos)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,        -- PRECIO EN CÉNTIMOS (29900 = 299.00€)
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

**MUY IMPORTANTE - PRECIOS EN CÉNTIMOS**:
```dart
// Para mostrar: céntimos a euros
String formatPrice(int cents) {
  return '${(cents / 100).toStringAsFixed(2)}€';
}
// 29900 -> "299.00€"

// Formato más elegante con separador de miles
String formatPriceElegant(int cents) {
  final euros = cents / 100;
  final formatter = NumberFormat.currency(
    locale: 'es_ES',
    symbol: '€',
    decimalDigits: 2,
  );
  return formatter.format(euros);
}
// 29900 -> "299,00 €"
```

---

### Tabla: orders (Pedidos del cliente)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,  -- Formato: "FM-2025-000001"
  user_id UUID REFERENCES profiles(id),
  status order_status DEFAULT 'pending',
  
  -- Dirección de envío
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'España',
  shipping_phone TEXT,
  
  -- Totales (TODO EN CÉNTIMOS)
  subtotal INTEGER DEFAULT 0,
  shipping_cost INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  
  -- Pago
  payment_method TEXT,           -- 'stripe', 'transfer', 'cash_on_delivery'
  stripe_payment_intent_id TEXT,
  
  -- Envío
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Estados y visualización para el cliente**:
```dart
Map<String, Color> statusColors = {
  'pending': Color(0xFFFFC107),    // Ámbar
  'paid': Color(0xFF4CAF50),       // Verde
  'processing': Color(0xFF2196F3), // Azul
  'shipped': Color(0xFF9C27B0),    // Púrpura
  'delivered': Color(0xFF009688),  // Teal
  'cancelled': Color(0xFFF44336),  // Rojo
  'refunded': Color(0xFF9E9E9E),   // Gris
};

Map<String, String> statusLabels = {
  'pending': 'Pendiente de pago',
  'paid': 'Pago confirmado',
  'processing': 'En preparación',
  'shipped': 'Enviado',
  'delivered': 'Entregado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
};

Map<String, IconData> statusIcons = {
  'pending': Icons.schedule,
  'paid': Icons.check_circle,
  'processing': Icons.inventory_2,
  'shipped': Icons.local_shipping,
  'delivered': Icons.done_all,
  'cancelled': Icons.cancel,
  'refunded': Icons.replay,
};
```

---

### Tabla: order_items (Items del pedido)
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
  unit_price INTEGER NOT NULL,    -- CÉNTIMOS
  total_price INTEGER NOT NULL,   -- CÉNTIMOS (unit_price * quantity)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: addresses (Direcciones guardadas)
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Casa',      -- 'Casa', 'Trabajo', 'Otro'
  full_name TEXT NOT NULL,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'España',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Ejemplo de gestión de dirección por defecto**:
```dart
// Al marcar una dirección como default, desmarcar las demás
Future<void> setDefaultAddress(String addressId) async {
  final userId = supabase.auth.currentUser!.id;
  
  // Quitar default de todas
  await supabase
    .from('addresses')
    .update({'is_default': false})
    .eq('user_id', userId);
  
  // Marcar la seleccionada
  await supabase
    .from('addresses')
    .update({'is_default': true})
    .eq('id', addressId);
}
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

**Funciones útiles**:
```dart
// Verificar si producto está en wishlist
Future<bool> isInWishlist(String productId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return false;
  
  final result = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  
  return result != null;
}

// Toggle wishlist (añadir/quitar)
Future<void> toggleWishlist(String productId) async {
  final userId = supabase.auth.currentUser!.id;
  final exists = await isInWishlist(productId);
  
  if (exists) {
    await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
  } else {
    await supabase
      .from('wishlist')
      .insert({'user_id': userId, 'product_id': productId});
  }
}
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
  reason TEXT NOT NULL,           -- Motivo de la devolución
  description TEXT,               -- Descripción adicional
  refund_amount INTEGER,          -- CÉNTIMOS
  refund_method TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Motivos de devolución predefinidos**:
```dart
List<String> returnReasons = [
  'Talla incorrecta',
  'Color diferente al esperado',
  'Producto defectuoso',
  'No corresponde con la descripción',
  'Cambio de opinión',
  'Llegó dañado',
  'Pedido duplicado',
  'Otro motivo',
];
```

---

### Tabla: return_items (Items de devolución)
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

### Tabla: discount_codes (Códigos de descuento)
```sql
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type discount_type NOT NULL,    -- 'percentage' o 'fixed'
  value INTEGER NOT NULL,         -- % o céntimos según type
  description TEXT,
  active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  min_order_amount INTEGER,       -- Pedido mínimo en céntimos
  max_discount_amount INTEGER,    -- Descuento máximo en céntimos
  first_purchase_only BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Tabla: newsletter_subscriptions (Newsletter)
```sql
CREATE TABLE newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  promo_code TEXT,                -- Código de descuento asignado
  promo_delivered BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'app'       -- 'website', 'app', 'checkout'
);
```

---

### Tabla: shipping_methods (Métodos de envío)
```sql
CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,          -- CÉNTIMOS
  estimated_days INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  icon TEXT,                      -- 'standard', 'express', 'same_day', 'pickup'
  sort_order INTEGER DEFAULT 0,
  min_order_amount INTEGER,       -- Solo disponible desde X céntimos
  max_order_amount INTEGER,
  free_above INTEGER,             -- Gratis si pedido > X céntimos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Ejemplo de cálculo de envío**:
```dart
class ShippingMethod {
  final String id;
  final String name;
  final String description;
  final int cost;
  final int estimatedDays;
  final String icon;
  final int? freeAbove;

  int calculateCost(int subtotal) {
    if (freeAbove != null && subtotal >= freeAbove!) {
      return 0;
    }
    return cost;
  }

  String get formattedCost => cost == 0 ? 'Gratis' : formatPrice(cost);
  
  String get deliveryEstimate => 
    estimatedDays == 1 ? '1 día' : '$estimatedDays días';
}
```

---

## FUNCIONES DE BASE DE DATOS (RPC)

### Validar código de descuento
```sql
-- Llamar: supabase.rpc('validate_discount_code', { 
--   code_text: 'DESCUENTO10', 
--   subtotal_cents: 15000, 
--   user_id_param: userId 
-- })
-- Retorna: { valid, message, discount_amount, discount_type, discount_value, code_id }
```

**Ejemplo de uso**:
```dart
Future<DiscountResult> validateDiscountCode(String code, int subtotal) async {
  final userId = supabase.auth.currentUser?.id;
  
  final response = await supabase.rpc('validate_discount_code', params: {
    'code_text': code.toUpperCase(),
    'subtotal_cents': subtotal,
    'user_id_param': userId,
  });
  
  return DiscountResult.fromJson(response);
}

class DiscountResult {
  final bool valid;
  final String message;
  final int? discountAmount;
  final String? discountType;
  final int? discountValue;
  final String? codeId;
  
  bool get isPercentage => discountType == 'percentage';
  String get displayValue => isPercentage 
    ? '$discountValue%' 
    : formatPrice(discountValue ?? 0);
}
```

---

## FUNCIONALIDADES DE LA APP CLIENTE

### 1. Pantalla de Inicio (Home)
**Secciones a mostrar**:

1. **Banner/Carrusel promocional**:
   - Imágenes de temporada
   - Ofertas destacadas
   - Nuevas colecciones

2. **Productos destacados** (featured = true):
```dart
final featuredProducts = await supabase
  .from('products')
  .select('*, categories(name, slug)')
  .eq('featured', true)
  .gt('stock', 0)
  .order('created_at', ascending: false)
  .limit(8);
```

3. **Categorías principales**:
```dart
final categories = await supabase
  .from('categories')
  .select('id, name, slug, image_url')
  .order('name');
```

4. **Nuevos productos**:
```dart
final newProducts = await supabase
  .from('products')
  .select('*, categories(name)')
  .gt('stock', 0)
  .order('created_at', ascending: false)
  .limit(10);
```

5. **Banner Newsletter**:
   - Input para email
   - Al suscribirse, recibe código de descuento

---

### 2. Catálogo / Tienda
**Funcionalidades**:

1. **Grid de productos** con:
   - Imagen principal
   - Nombre
   - Precio (y precio anterior si hay descuento)
   - Badge "Nuevo" si < 7 días
   - Badge "Agotado" si stock = 0
   - Botón wishlist (corazón)

2. **Filtros disponibles**:
```dart
class ProductFilters {
  String? categoryId;
  List<String> sizes;
  List<String> colors;
  int? minPrice;        // En céntimos
  int? maxPrice;        // En céntimos
  bool? inStock;
  String sortBy;        // 'newest', 'price_asc', 'price_desc', 'name'
}
```

3. **Query con filtros**:
```dart
Future<List<Product>> getProducts(ProductFilters filters) async {
  var query = supabase
    .from('products')
    .select('*, categories(id, name, slug)');
  
  if (filters.categoryId != null) {
    query = query.eq('category_id', filters.categoryId!);
  }
  
  if (filters.inStock == true) {
    query = query.gt('stock', 0);
  }
  
  if (filters.minPrice != null) {
    query = query.gte('price', filters.minPrice!);
  }
  
  if (filters.maxPrice != null) {
    query = query.lte('price', filters.maxPrice!);
  }
  
  // Ordenamiento
  switch (filters.sortBy) {
    case 'price_asc':
      query = query.order('price', ascending: true);
      break;
    case 'price_desc':
      query = query.order('price', ascending: false);
      break;
    case 'name':
      query = query.order('name', ascending: true);
      break;
    default:
      query = query.order('created_at', ascending: false);
  }
  
  final response = await query;
  return response.map((e) => Product.fromJson(e)).toList();
}
```

4. **Buscador**:
```dart
Future<List<Product>> searchProducts(String query) async {
  final response = await supabase
    .from('products')
    .select('*, categories(name)')
    .or('name.ilike.%$query%,description.ilike.%$query%')
    .gt('stock', 0)
    .order('name')
    .limit(20);
  
  return response.map((e) => Product.fromJson(e)).toList();
}
```

---

### 3. Detalle de Producto
**Información a mostrar**:

1. **Galería de imágenes**:
   - Carrusel horizontal o PageView
   - Zoom al hacer tap
   - Indicador de posición

2. **Información básica**:
   - Nombre del producto
   - Precio (formateado)
   - Categoría (con link)
   - Descripción larga
   - Material

3. **Selector de talla**:
```dart
Widget buildSizeSelector(List<String> sizes, String? selected, Function(String) onSelect) {
  return Wrap(
    spacing: 8,
    children: sizes.map((size) {
      final isSelected = size == selected;
      return GestureDetector(
        onTap: () => onSelect(size),
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: isSelected ? navy900 : Colors.white,
            border: Border.all(
              color: isSelected ? navy900 : charcoal400,
            ),
          ),
          child: Center(
            child: Text(
              size,
              style: TextStyle(
                color: isSelected ? Colors.white : charcoal600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      );
    }).toList(),
  );
}
```

4. **Selector de color** (si aplica):
```dart
Widget buildColorSelector(List<String> colors, String? selected, Function(String) onSelect) {
  return Wrap(
    spacing: 12,
    children: colors.map((color) {
      final isSelected = color == selected;
      return GestureDetector(
        onTap: () => onSelect(color),
        child: Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: getColorFromName(color),
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? navy900 : Colors.transparent,
                  width: 2,
                ),
              ),
            ),
            SizedBox(height: 4),
            Text(color, style: TextStyle(fontSize: 12)),
          ],
        ),
      );
    }).toList(),
  );
}

Color getColorFromName(String name) {
  final colorMap = {
    'negro': Colors.black,
    'azul marino': Color(0xFF1A237E),
    'gris': Colors.grey,
    'blanco': Colors.white,
    'burdeos': Color(0xFF800020),
    'marrón': Colors.brown,
    'beige': Color(0xFFF5F5DC),
    // ... más colores
  };
  return colorMap[name.toLowerCase()] ?? Colors.grey;
}
```

5. **Stock disponible**:
```dart
Widget buildStockIndicator(int stock) {
  if (stock == 0) {
    return Text(
      'Agotado',
      style: TextStyle(color: errorRed, fontWeight: FontWeight.bold),
    );
  } else if (stock <= 5) {
    return Text(
      '¡Solo quedan $stock unidades!',
      style: TextStyle(color: warningAmber),
    );
  }
  return Text(
    'En stock',
    style: TextStyle(color: successGreen),
  );
}
```

6. **Botones de acción**:
   - Añadir al carrito
   - Añadir a wishlist (corazón)
   - Compartir producto

7. **Productos relacionados**:
```dart
Future<List<Product>> getRelatedProducts(String productId, String categoryId) async {
  final response = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('category_id', categoryId)
    .neq('id', productId)
    .gt('stock', 0)
    .order('created_at', ascending: false)
    .limit(4);
  
  return response.map((e) => Product.fromJson(e)).toList();
}
```

---

### 4. Carrito de Compras
**Estado local del carrito** (usando Provider/Riverpod):

```dart
class CartItem {
  final String productId;
  final String productName;
  final String productImage;
  final String productSlug;
  final int unitPrice;
  final String? size;
  final String? color;
  int quantity;
  
  int get totalPrice => unitPrice * quantity;
}

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];
  
  List<CartItem> get items => _items;
  
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);
  
  int get subtotal => _items.fold(0, (sum, item) => sum + item.totalPrice);
  
  void addItem(CartItem item) {
    // Buscar si ya existe con misma talla y color
    final existingIndex = _items.indexWhere((i) => 
      i.productId == item.productId && 
      i.size == item.size && 
      i.color == item.color
    );
    
    if (existingIndex >= 0) {
      _items[existingIndex].quantity += item.quantity;
    } else {
      _items.add(item);
    }
    notifyListeners();
    _saveToStorage();
  }
  
  void removeItem(int index) {
    _items.removeAt(index);
    notifyListeners();
    _saveToStorage();
  }
  
  void updateQuantity(int index, int quantity) {
    if (quantity <= 0) {
      removeItem(index);
    } else {
      _items[index].quantity = quantity;
      notifyListeners();
      _saveToStorage();
    }
  }
  
  void clear() {
    _items.clear();
    notifyListeners();
    _saveToStorage();
  }
  
  // Persistencia local
  Future<void> _saveToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final json = _items.map((e) => e.toJson()).toList();
    prefs.setString('cart', jsonEncode(json));
  }
  
  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString('cart');
    if (json != null) {
      final list = jsonDecode(json) as List;
      _items.clear();
      _items.addAll(list.map((e) => CartItem.fromJson(e)));
      notifyListeners();
    }
  }
}
```

**UI del carrito**:
- Lista de items con imagen, nombre, talla/color, cantidad, precio
- Botones +/- para cantidad
- Botón eliminar (swipe o icono)
- Subtotal
- Input código de descuento
- Botón "Proceder al pago"

---

### 5. Proceso de Checkout
**Pasos del checkout**:

#### Paso 1: Dirección de envío
```dart
// Obtener direcciones guardadas
final addresses = await supabase
  .from('addresses')
  .select('*')
  .eq('user_id', userId)
  .order('is_default', ascending: false);

// O permitir dirección nueva (guest checkout)
class ShippingAddress {
  String fullName;
  String phone;
  String addressLine1;
  String? addressLine2;
  String city;
  String postalCode;
  String country = 'España';
}
```

#### Paso 2: Método de envío
```dart
final shippingMethods = await supabase
  .from('shipping_methods')
  .select('*')
  .eq('is_enabled', true)
  .order('sort_order');

// Mostrar cada método con su precio y tiempo estimado
// Calcular si es gratis según subtotal
```

#### Paso 3: Código de descuento (opcional)
```dart
// Usar RPC validate_discount_code
// Mostrar descuento aplicado o mensaje de error
```

#### Paso 4: Resumen y pago
```dart
class OrderSummary {
  int subtotal;
  int shippingCost;
  int discount;
  int tax;
  int total;
  
  int calculateTotal() {
    // Subtotal - descuento + envío + impuestos
    return subtotal - discount + shippingCost + tax;
  }
}
```

#### Paso 5: Método de pago
**Opciones disponibles**:
1. **Tarjeta (Stripe)** - Integrar `flutter_stripe`
2. **Transferencia bancaria** - Mostrar datos bancarios
3. **Contrareembolso** - Cargo extra configurable

**Crear pedido**:
```dart
Future<String> createOrder(OrderData data) async {
  // 1. Crear el pedido
  final orderResponse = await supabase
    .from('orders')
    .insert({
      'user_id': userId,
      'status': 'pending',
      'shipping_name': data.shippingAddress.fullName,
      'shipping_address': data.shippingAddress.addressLine1,
      'shipping_city': data.shippingAddress.city,
      'shipping_postal_code': data.shippingAddress.postalCode,
      'shipping_country': data.shippingAddress.country,
      'shipping_phone': data.shippingAddress.phone,
      'subtotal': data.subtotal,
      'shipping_cost': data.shippingCost,
      'discount': data.discount,
      'tax': data.tax,
      'total': data.total,
      'payment_method': data.paymentMethod,
      'notes': data.notes,
    })
    .select()
    .single();
  
  final orderId = orderResponse['id'];
  
  // 2. Crear los items del pedido
  final orderItems = data.cartItems.map((item) => {
    'order_id': orderId,
    'product_id': item.productId,
    'product_name': item.productName,
    'product_image': item.productImage,
    'product_slug': item.productSlug,
    'quantity': item.quantity,
    'size': item.size,
    'color': item.color,
    'unit_price': item.unitPrice,
    'total_price': item.totalPrice,
  }).toList();
  
  await supabase.from('order_items').insert(orderItems);
  
  // 3. Registrar uso del código de descuento
  if (data.discountCodeId != null) {
    await supabase.from('discount_code_redemptions').insert({
      'code_id': data.discountCodeId,
      'user_id': userId,
      'order_id': orderId,
      'discount_amount': data.discount,
    });
    
    // Incrementar contador de usos
    await supabase.rpc('increment_discount_uses', params: {
      'code_id': data.discountCodeId,
    });
  }
  
  return orderId;
}
```

---

### 6. Mi Cuenta
**Secciones del perfil**:

#### 6.1 Datos personales
```dart
// Obtener perfil
final profile = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Actualizar perfil
await supabase
  .from('profiles')
  .update({
    'full_name': newName,
    'phone': newPhone,
    'updated_at': DateTime.now().toIso8601String(),
  })
  .eq('id', userId);
```

#### 6.2 Mis pedidos
```dart
final orders = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', ascending: false);

// Para cada pedido, mostrar:
// - Número de pedido
// - Fecha
// - Estado (con color)
// - Total
// - Botón "Ver detalle"
```

**Detalle del pedido**:
```dart
final order = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .single();

final items = await supabase
  .from('order_items')
  .select('*')
  .eq('order_id', orderId);

// Mostrar:
// - Todos los items con imagen, nombre, talla, color, cantidad, precio
// - Dirección de envío
// - Método de pago
// - Número de tracking (si enviado)
// - Totales desglosados
// - Botón "Solicitar devolución" (si delivered)
```

#### 6.3 Mis direcciones
```dart
// CRUD de direcciones
// Marcar como predeterminada
// Eliminar dirección
```

#### 6.4 Lista de deseos
```dart
final wishlist = await supabase
  .from('wishlist')
  .select('*, products(*)')
  .eq('user_id', userId)
  .order('created_at', ascending: false);

// Mostrar productos con:
// - Imagen
// - Nombre
// - Precio
// - Botón "Añadir al carrito"
// - Botón "Eliminar de favoritos"
```

#### 6.5 Mis devoluciones
```dart
final returns = await supabase
  .from('returns')
  .select('*, orders(order_number)')
  .eq('user_id', userId)
  .order('created_at', ascending: false);

// Mostrar:
// - Número de devolución
// - Pedido relacionado
// - Estado
// - Fecha
// - Importe a reembolsar
```

#### 6.6 Cambiar contraseña
```dart
await supabase.auth.updateUser(
  UserAttributes(password: newPassword),
);
```

#### 6.7 Cerrar sesión
```dart
await supabase.auth.signOut();
// Limpiar datos locales
// Navegar a login
```

---

### 7. Solicitar Devolución
**Flujo**:

1. Mostrar items del pedido (solo si status = 'delivered')
2. Seleccionar items a devolver
3. Seleccionar cantidad de cada item
4. Seleccionar motivo (dropdown)
5. Descripción adicional (opcional)
6. Confirmar solicitud

```dart
Future<void> createReturn(ReturnRequest request) async {
  // 1. Crear la devolución
  final returnResponse = await supabase
    .from('returns')
    .insert({
      'order_id': request.orderId,
      'user_id': userId,
      'status': 'requested',
      'reason': request.reason,
      'description': request.description,
    })
    .select()
    .single();
  
  final returnId = returnResponse['id'];
  
  // 2. Crear los items de devolución
  final returnItems = request.items.map((item) => {
    'return_id': returnId,
    'order_item_id': item.orderItemId,
    'quantity': item.quantity,
    'reason': item.reason,
  }).toList();
  
  await supabase.from('return_items').insert(returnItems);
}
```

---

### 8. Autenticación
**Pantallas**:

#### 8.1 Login
```dart
Future<void> signIn(String email, String password) async {
  final response = await supabase.auth.signInWithPassword(
    email: email,
    password: password,
  );
  
  if (response.user != null) {
    // Verificar que es customer (no admin)
    final profile = await supabase
      .from('profiles')
      .select('role')
      .eq('id', response.user!.id)
      .single();
    
    if (profile['role'] == 'admin') {
      await supabase.auth.signOut();
      throw Exception('Usa la app de administración para acceder como admin');
    }
    
    // Login exitoso - navegar a home
  }
}
```

#### 8.2 Registro
```dart
Future<void> signUp(String email, String password, String fullName) async {
  final response = await supabase.auth.signUp(
    email: email,
    password: password,
    data: {'full_name': fullName}, // Se guarda en user_metadata
  );
  
  // El trigger de la BD crea automáticamente el perfil
  // Navegar a verificación de email o home
}
```

#### 8.3 Recuperar contraseña
```dart
await supabase.auth.resetPasswordForEmail(email);
// Mostrar mensaje: "Te hemos enviado un email para restablecer tu contraseña"
```

#### 8.4 Login social (OAuth)
```dart
// Google
await supabase.auth.signInWithOAuth(
  OAuthProvider.google,
  redirectTo: 'io.supabase.fashionmarket://login-callback/',
);

// Apple (iOS)
await supabase.auth.signInWithOAuth(
  OAuthProvider.apple,
);
```

---

### 9. Checkout como invitado (Guest Checkout)
**Permitir comprar sin crear cuenta**:

```dart
// Guardar datos de invitado en el pedido directamente
// No se necesita user_id (puede ser null)
// Guardar email para comunicaciones

await supabase.from('orders').insert({
  'user_id': null, // Guest
  'guest_email': guestEmail,
  'guest_name': guestName,
  // ... resto de datos
});
```

---

### 10. Notificaciones Push (Opcional)
**Usar Firebase Cloud Messaging**:

Notificar al cliente cuando:
- Pedido confirmado
- Pedido enviado (con tracking)
- Pedido entregado
- Devolución procesada

---

### 11. Búsqueda con Historial
```dart
class SearchProvider extends ChangeNotifier {
  List<String> _recentSearches = [];
  
  Future<void> addSearch(String query) async {
    _recentSearches.remove(query); // Evitar duplicados
    _recentSearches.insert(0, query);
    if (_recentSearches.length > 10) {
      _recentSearches = _recentSearches.sublist(0, 10);
    }
    notifyListeners();
    
    final prefs = await SharedPreferences.getInstance();
    prefs.setStringList('recent_searches', _recentSearches);
  }
  
  Future<void> loadRecentSearches() async {
    final prefs = await SharedPreferences.getInstance();
    _recentSearches = prefs.getStringList('recent_searches') ?? [];
    notifyListeners();
  }
  
  void clearHistory() {
    _recentSearches.clear();
    notifyListeners();
    SharedPreferences.getInstance().then((p) => p.remove('recent_searches'));
  }
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
    routes.dart
  models/
    product.dart
    category.dart
    cart_item.dart
    order.dart
    order_item.dart
    address.dart
    wishlist_item.dart
    return_request.dart
    discount_code.dart
    shipping_method.dart
    user_profile.dart
  services/
    auth_service.dart
    products_service.dart
    categories_service.dart
    cart_service.dart
    orders_service.dart
    addresses_service.dart
    wishlist_service.dart
    returns_service.dart
    checkout_service.dart
    discount_service.dart
    shipping_service.dart
    newsletter_service.dart
    search_service.dart
  providers/
    auth_provider.dart
    cart_provider.dart
    products_provider.dart
    wishlist_provider.dart
    checkout_provider.dart
    search_provider.dart
  screens/
    splash_screen.dart
    onboarding/
      onboarding_screen.dart
    auth/
      login_screen.dart
      register_screen.dart
      forgot_password_screen.dart
    home/
      home_screen.dart
    catalog/
      catalog_screen.dart
      category_products_screen.dart
      search_screen.dart
      search_results_screen.dart
    product/
      product_detail_screen.dart
      product_gallery_screen.dart
    cart/
      cart_screen.dart
    checkout/
      checkout_screen.dart
      address_selection_screen.dart
      shipping_selection_screen.dart
      payment_screen.dart
      order_confirmation_screen.dart
    account/
      account_screen.dart
      profile_screen.dart
      orders_screen.dart
      order_detail_screen.dart
      addresses_screen.dart
      address_form_screen.dart
      wishlist_screen.dart
      returns_screen.dart
      return_request_screen.dart
      change_password_screen.dart
  widgets/
    common/
      loading_widget.dart
      error_widget.dart
      empty_state.dart
      custom_button.dart
      custom_input.dart
      price_text.dart
      network_image.dart
      badge.dart
    home/
      banner_carousel.dart
      category_card.dart
      featured_products.dart
      new_arrivals.dart
      newsletter_banner.dart
    catalog/
      product_card.dart
      product_grid.dart
      filter_sheet.dart
      sort_dropdown.dart
      search_bar.dart
    product/
      image_gallery.dart
      size_selector.dart
      color_selector.dart
      quantity_selector.dart
      add_to_cart_button.dart
      wishlist_button.dart
      related_products.dart
    cart/
      cart_item_tile.dart
      cart_summary.dart
      discount_input.dart
    checkout/
      address_card.dart
      shipping_option.dart
      payment_option.dart
      order_summary.dart
    account/
      order_card.dart
      status_badge.dart
      address_tile.dart
      wishlist_tile.dart
  utils/
    formatters.dart
    validators.dart
    constants.dart
    extensions.dart
```

---

## TEMA Y COLORES

**Paleta de marca FASHIONMARKET** (estilo premium masculino):
```dart
// Colores principales
const navy900 = Color(0xFF1A237E);   // Azul marino oscuro - Principal
const navy700 = Color(0xFF303F9F);   // Azul marino medio
const navy500 = Color(0xFF3F51B5);   // Azul intermedio

// Neutros
const charcoal900 = Color(0xFF212121);  // Casi negro - Textos principales
const charcoal700 = Color(0xFF424242);
const charcoal600 = Color(0xFF546E7A);  // Textos secundarios
const charcoal400 = Color(0xFF90A4AE);  // Textos deshabilitados
const charcoal200 = Color(0xFFB0BEC5);
const charcoal100 = Color(0xFFECEFF1);  // Fondos claros
const charcoal50 = Color(0xFFFAFAFA);   // Fondo página

// Acentos
const gold = Color(0xFFD4AF37);         // Dorado - Detalles premium
const burgundy = Color(0xFF800020);     // Burdeos - Acentos

// Estados
const successGreen = Color(0xFF4CAF50);
const warningAmber = Color(0xFFFFC107);
const errorRed = Color(0xFFF44336);
const infoBlue = Color(0xFF2196F3);

// Tema completo
ThemeData appTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.light,
  primaryColor: navy900,
  scaffoldBackgroundColor: charcoal50,
  
  colorScheme: ColorScheme.light(
    primary: navy900,
    onPrimary: Colors.white,
    secondary: navy700,
    onSecondary: Colors.white,
    surface: Colors.white,
    onSurface: charcoal900,
    error: errorRed,
    onError: Colors.white,
  ),
  
  appBarTheme: AppBarTheme(
    backgroundColor: Colors.white,
    foregroundColor: charcoal900,
    elevation: 0,
    centerTitle: true,
    titleTextStyle: TextStyle(
      color: charcoal900,
      fontSize: 18,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.5,
    ),
  ),
  
  textTheme: TextTheme(
    displayLarge: TextStyle(
      color: charcoal900,
      fontSize: 32,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.5,
    ),
    headlineMedium: TextStyle(
      color: charcoal900,
      fontSize: 24,
      fontWeight: FontWeight.w600,
    ),
    titleLarge: TextStyle(
      color: charcoal900,
      fontSize: 18,
      fontWeight: FontWeight.w600,
    ),
    bodyLarge: TextStyle(
      color: charcoal700,
      fontSize: 16,
    ),
    bodyMedium: TextStyle(
      color: charcoal600,
      fontSize: 14,
    ),
    labelLarge: TextStyle(
      color: charcoal900,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.5,
    ),
  ),
  
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: navy900,
      foregroundColor: Colors.white,
      minimumSize: Size(double.infinity, 52),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.zero, // Estilo angular elegante
      ),
      textStyle: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: 1,
      ),
    ),
  ),
  
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: navy900,
      minimumSize: Size(double.infinity, 52),
      side: BorderSide(color: navy900),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
    ),
  ),
  
  inputDecorationTheme: InputDecorationTheme(
    border: OutlineInputBorder(
      borderRadius: BorderRadius.zero,
      borderSide: BorderSide(color: charcoal200),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.zero,
      borderSide: BorderSide(color: charcoal200),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.zero,
      borderSide: BorderSide(color: navy900, width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.zero,
      borderSide: BorderSide(color: errorRed),
    ),
    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
  ),
  
  cardTheme: CardTheme(
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.zero,
      side: BorderSide(color: charcoal100),
    ),
  ),
  
  bottomNavigationBarTheme: BottomNavigationBarThemeData(
    backgroundColor: Colors.white,
    selectedItemColor: navy900,
    unselectedItemColor: charcoal400,
    type: BottomNavigationBarType.fixed,
    elevation: 8,
  ),
);
```

---

## PAQUETES FLUTTER RECOMENDADOS

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Supabase
  supabase_flutter: ^2.3.0
  
  # Estado
  flutter_riverpod: ^2.4.9
  # o provider: ^6.1.1
  
  # Navegación
  go_router: ^13.0.0
  
  # UI
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  flutter_svg: ^2.0.9
  carousel_slider: ^4.2.1
  photo_view: ^0.14.0        # Zoom de imágenes
  flutter_rating_bar: ^4.0.1
  badges: ^3.1.2
  
  # Formularios
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^9.1.0
  
  # Pagos
  flutter_stripe: ^10.1.1
  
  # Almacenamiento local
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0
  
  # Utilidades
  intl: ^0.18.1
  url_launcher: ^6.2.2
  share_plus: ^7.2.1
  
  # Notificaciones
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.10
  flutter_local_notifications: ^16.3.0
  
  # Animaciones
  lottie: ^3.0.0
  animations: ^2.0.8
  
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
```

---

## CONSIDERACIONES DE UX/UI

### 1. Diseño Premium
- **Sin bordes redondeados**: Usar `BorderRadius.zero` para aspecto elegante
- **Espaciado generoso**: Mínimo 16px de padding
- **Tipografía limpia**: Pesos 400 (regular), 500 (medium), 600 (semibold)
- **Imágenes de calidad**: Usar Cloudinary con transformaciones

### 2. Micro-interacciones
```dart
// Animación al añadir al carrito
ScaleTransition + Vibration

// Animación wishlist (corazón)
AnimatedSwitcher con icono lleno/vacío

// Skeleton loading
Shimmer mientras cargan productos
```

### 3. Estados vacíos elegantes
```dart
Widget buildEmptyState({
  required IconData icon,
  required String title,
  required String subtitle,
  String? buttonText,
  VoidCallback? onButtonPressed,
}) {
  return Center(
    child: Padding(
      padding: EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: charcoal300),
          SizedBox(height: 24),
          Text(title, style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: charcoal900,
          )),
          SizedBox(height: 8),
          Text(subtitle, textAlign: TextAlign.center, style: TextStyle(
            color: charcoal500,
          )),
          if (buttonText != null) ...[
            SizedBox(height: 24),
            ElevatedButton(
              onPressed: onButtonPressed,
              child: Text(buttonText),
            ),
          ],
        ],
      ),
    ),
  );
}
```

### 4. Accesibilidad
- Contraste mínimo WCAG AA
- Labels en todos los inputs
- Tamaños táctiles mínimos 48x48
- Soporte para lectores de pantalla

---

## FLUJOS CRÍTICOS

### Flujo de compra completo
```
Home → Catálogo → Producto → Añadir al carrito → Carrito → 
Checkout (Dirección → Envío → Descuento → Pago) → Confirmación
```

### Flujo de devolución
```
Mi cuenta → Mis pedidos → Detalle pedido (entregado) → 
Solicitar devolución → Seleccionar items → Confirmar
```

### Flujo de primer uso
```
Splash → Onboarding (3 pantallas) → Login/Registro → Home
```

---

## INICIO RÁPIDO

```dart
// 1. Inicializar Supabase
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'TU_SUPABASE_URL',
    anonKey: 'TU_SUPABASE_ANON_KEY',
  );
  
  runApp(
    ProviderScope(
      child: FashionMarketApp(),
    ),
  );
}

// 2. Obtener cliente
final supabase = Supabase.instance.client;

// 3. Ejemplo: Listar productos destacados
final featured = await supabase
  .from('products')
  .select('*, categories(name)')
  .eq('featured', true)
  .gt('stock', 0)
  .order('created_at', ascending: false)
  .limit(8);

// 4. Ejemplo: Añadir a wishlist
await supabase.from('wishlist').insert({
  'user_id': supabase.auth.currentUser!.id,
  'product_id': productId,
});

// 5. Ejemplo: Crear pedido completo
final order = await supabase
  .from('orders')
  .insert(orderData)
  .select()
  .single();
```

---

## CONTACTO Y RECURSOS

- **Web en producción**: https://eloyfashionstore.victoriafp.online
- **API Base URL**: (usar Supabase SDK, no REST directo)
- **Imágenes**: Cloudinary - Cloud name: `dfd2imbfs`

---

## CONSIDERACIONES IMPORTANTES

1. **PRECIOS SIEMPRE EN CÉNTIMOS** en la base de datos. Mostrar en euros en la UI.

2. **RLS (Row Level Security)**: Las políticas están configuradas. Los clientes solo pueden:
   - Ver todos los productos y categorías
   - Ver/editar su propio perfil
   - Ver/crear/editar sus direcciones
   - Ver sus propios pedidos
   - Gestionar su wishlist
   - Crear solicitudes de devolución de sus pedidos

3. **Carrito local**: El carrito se guarda en SharedPreferences, no en la BD.
   - Al hacer login, NO se sincroniza (el carrito es solo local)
   - Se limpia después de hacer un pedido

4. **Guest checkout**: Permitir comprar sin cuenta:
   - user_id puede ser null en orders
   - Guardar guest_email y guest_name

5. **Imágenes de productos**: Array de URLs de Cloudinary.
   - Primera imagen = imagen principal
   - Usar transformaciones de Cloudinary para thumbnails

6. **Tallas según categoría**:
```dart
Map<String, List<String>> sizesByCategory = {
  'trajes': ['46', '48', '50', '52', '54', '56'],
  'camisas': ['S', 'M', 'L', 'XL', 'XXL'],
  'pantalones': ['46', '48', '50', '52', '54', '56'],
  'zapatos': ['39', '40', '41', '42', '43', '44', '45'],
  'calcetines': ['39-42', '43-46'],
  'cinturones': ['85', '90', '95', '100', '105', '110'],
  'corbatas': ['Única'],
  'pañuelos': ['Única'],
  'tirantes': ['Única (ajustable)'],
  'gemelos': ['Única'],
};
```

7. **Deep links** para compartir productos:
```
https://eloyfashionstore.victoriafp.online/producto/[slug]
```

---

Este prompt contiene toda la información necesaria para desarrollar la aplicación cliente Flutter de FASHIONMARKET. El backend está completamente funcional - solo necesitas crear la UI y conectarte a Supabase.

**¡Buena suerte con el desarrollo!** 🎩👔
