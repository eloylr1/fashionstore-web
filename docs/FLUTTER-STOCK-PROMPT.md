# Prompt para Implementar Sistema de Stock por Variantes en Flutter

## Contexto del Proyecto

Tengo una aplicación Flutter para gestión de tienda de moda (FashionMarket). Necesito implementar el sistema de **stock por variantes (talla + color)** y **notificaciones de disponibilidad** que ya funciona en mi web.

## Base de Datos (Supabase/PostgreSQL)

### Tabla: `product_variant_stock`
```sql
CREATE TABLE product_variant_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20),           -- Talla: XS, S, M, L, XL, 44, 46, etc.
  color VARCHAR(50),          -- Color: "Azul Marino", "Blanco", NULL si no aplica
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, size, color)
);
```

### Tabla: `stock_notifications`
```sql
CREATE TABLE stock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  color VARCHAR(50),          -- NULL si el producto no tiene colores
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, size, color, email)
);
```

### Tabla: `products` (campos relevantes)
```sql
-- Ya existe, estos son los campos relevantes:
- id UUID
- name VARCHAR
- slug VARCHAR
- stock INTEGER              -- Stock TOTAL (suma de todas las variantes)
- sizes TEXT[]               -- Array de tallas: ["S", "M", "L", "XL"]
- colors TEXT[]              -- Array de colores: ["Azul Marino", "Blanco"] o NULL
- images TEXT[]
```

---

## Funcionalidades a Implementar

### 1. PANEL ADMIN: Gestión de Stock por Variantes

**Pantalla: StockManagerScreen**

Debe mostrar una lista de productos con:
- Nombre del producto
- Stock total
- Indicador visual si tiene stock bajo (< 5 unidades en alguna variante)

Al pulsar un producto, abrir **StockDetailScreen** con:

#### Para productos CON colores:
```
┌─────────────────────────────────────────────────────────────┐
│ PANTALÓN LANA ESPIGA                                        │
│ Stock total: 24 unidades                                    │
├─────────────────────────────────────────────────────────────┤
│ ▼ Marrón Espiga                                    [12 uds] │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┐                     │
│   │ 46  │ 48  │ 50  │ 52  │ 54  │ 56  │                     │
│   │  2  │  2  │  2  │  2  │  2  │  2  │  ← Input editable   │
│   └─────┴─────┴─────┴─────┴─────┴─────┘                     │
│                                                             │
│ ▼ Gris Oscuro                                      [12 uds] │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┐                     │
│   │ 46  │ 48  │ 50  │ 52  │ 54  │ 56  │                     │
│   │  2  │  2  │  2  │  2  │  2  │  2  │                     │
│   └─────┴─────┴─────┴─────┴─────┴─────┘                     │
├─────────────────────────────────────────────────────────────┤
│                    [💾 Guardar Cambios]                     │
└─────────────────────────────────────────────────────────────┘
```

#### Para productos SIN colores:
```
┌─────────────────────────────────────────────────────────────┐
│ CAMISA OXFORD CLÁSICA                                       │
│ Stock total: 30 unidades                                    │
├─────────────────────────────────────────────────────────────┤
│ Stock por Talla                                             │
│   ┌─────┬─────┬─────┬─────┬─────┐                           │
│   │  S  │  M  │  L  │ XL  │ XXL │                           │
│   │  5  │  8  │  7  │  6  │  4  │  ← Input editable         │
│   └─────┴─────┴─────┴─────┴─────┘                           │
├─────────────────────────────────────────────────────────────┤
│                    [💾 Guardar Cambios]                     │
└─────────────────────────────────────────────────────────────┘
```

**Lógica de guardado:**
1. Al cambiar cualquier valor y pulsar "Guardar":
2. Enviar array de updates: `[{ size, color, stock }, ...]`
3. El backend actualiza `product_variant_stock`
4. Recalcula `products.stock` = suma de todas las variantes
5. **Si alguna variante pasó de 0 a >0:** Enviar notificaciones por email

---

### 2. APP CLIENTE: Selector de Talla y Color con Stock

**Pantalla: ProductDetailScreen**

#### Flujo de selección:

1. **Si el producto tiene colores:**
   - Mostrar selector de COLOR primero (botones con nombre del color)
   - Al seleccionar color, mostrar grid de TALLAS
   - Cada talla muestra stock: `"M (3)"` o `"M (Sin stock)"`

2. **Si el producto NO tiene colores:**
   - Mostrar solo grid de TALLAS con stock

#### Estado del stock:
```dart
// Modelo para stock por variante
class VariantStock {
  final String size;
  final String? color;
  final int stock;
}

// Obtener stock de la API
Future<List<VariantStock>> getProductStock(String productId) async {
  final response = await supabase
    .from('product_variant_stock')
    .select()
    .eq('product_id', productId);
  // Parsear respuesta...
}

// Obtener stock de variante específica
int getVariantStock(String size, String? color) {
  if (hasColors && color != null) {
    return variants.firstWhere(
      (v) => v.size == size && v.color == color,
      orElse: () => VariantStock(size: size, color: color, stock: 0)
    ).stock;
  }
  return variants.firstWhere(
    (v) => v.size == size,
    orElse: () => VariantStock(size: size, stock: 0)
  ).stock;
}
```

#### Visualización de tallas:
```dart
// Estilo de botón de talla
BoxDecoration getTallaDecoration(int stock, bool isSelected) {
  if (isSelected) {
    return BoxDecoration(
      color: stock > 0 ? Colors.navy : Colors.grey[300],
      border: Border.all(color: Colors.navy, width: 2),
    );
  }
  if (stock == 0) {
    return BoxDecoration(
      color: Colors.grey[100],
      border: Border.all(color: Colors.grey[300]),
    );
  }
  return BoxDecoration(
    border: Border.all(color: Colors.grey[400]),
  );
}
```

---

### 3. NOTIFICACIONES DE STOCK (Cliente)

**Cuando el usuario selecciona una variante sin stock:**

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ 48 / Marrón Espiga sin stock                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑️ Avisarme a: usuario@email.com                        │ │
│ │                                    [Avísame]            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Condiciones:**
- Solo mostrar si el usuario está **logueado**
- Pre-rellenar con el email del usuario
- Si NO está logueado, mostrar: "Inicia sesión para recibir aviso"

**Lógica:**
```dart
// Suscribirse a notificación
Future<void> subscribeToStockNotification({
  required String productId,
  required String size,
  String? color,
  required String email,
}) async {
  await supabase.from('stock_notifications').upsert({
    'product_id': productId,
    'size': size,
    'color': color,
    'email': email,
    'user_id': currentUser?.id,
    'notified': false,
  });
}
```

---

### 4. API Endpoints Necesarios

#### GET `/api/products/{productId}/stock`
Retorna stock por variante:
```json
{
  "stockByVariant": [
    { "size": "46", "color": "Marrón Espiga", "stock": 2 },
    { "size": "48", "color": "Marrón Espiga", "stock": 0 },
    { "size": "46", "color": "Gris Oscuro", "stock": 3 }
  ],
  "stockBySize": [
    { "size": "46", "stock": 5 },
    { "size": "48", "stock": 0 }
  ],
  "hasVariantStock": true
}
```

#### PUT `/api/admin/products/{productId}/stock`
Actualiza stock (admin):
```json
{
  "updates": [
    { "size": "46", "color": "Marrón Espiga", "stock": 5 },
    { "size": "48", "color": "Marrón Espiga", "stock": 3 }
  ]
}
```
Respuesta incluye `notificationsSent: 2` si se enviaron notificaciones.

#### POST `/api/products/{productId}/notify-stock`
Suscribirse a notificación:
```json
{
  "email": "usuario@email.com",
  "size": "48",
  "color": "Marrón Espiga"
}
```

---

### 5. Envío de Notificaciones (Backend)

Cuando el admin actualiza stock y una variante pasa de 0 a >0:

1. Buscar en `stock_notifications` donde:
   - `product_id` = producto actualizado
   - `size` = talla actualizada
   - `color` = color actualizado (o NULL)
   - `notified` = false

2. Para cada registro encontrado:
   - Enviar email con plantilla bonita
   - Marcar `notified = true`, `notified_at = now()`

**Plantilla de email:**
```
Asunto: ¡{nombre_producto} vuelve a estar disponible!

Cuerpo:
- Imagen del producto
- Nombre del producto
- Variante disponible: "Talla 48 / Marrón Espiga"
- Botón: "Ver producto →"
- Footer con logo de la tienda
```

---

## Modelo de Datos Dart

```dart
// models/product_variant_stock.dart
class ProductVariantStock {
  final String id;
  final String productId;
  final String size;
  final String? color;
  final int stock;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  ProductVariantStock({
    required this.id,
    required this.productId,
    required this.size,
    this.color,
    required this.stock,
    this.createdAt,
    this.updatedAt,
  });

  factory ProductVariantStock.fromJson(Map<String, dynamic> json) {
    return ProductVariantStock(
      id: json['id'],
      productId: json['product_id'],
      size: json['size'],
      color: json['color'],
      stock: json['stock'] ?? 0,
      createdAt: json['created_at'] != null 
        ? DateTime.parse(json['created_at']) 
        : null,
      updatedAt: json['updated_at'] != null 
        ? DateTime.parse(json['updated_at']) 
        : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'product_id': productId,
    'size': size,
    'color': color,
    'stock': stock,
  };
}

// models/stock_notification.dart
class StockNotification {
  final String id;
  final String productId;
  final String size;
  final String? color;
  final String email;
  final String? userId;
  final bool notified;
  final DateTime? notifiedAt;
  final DateTime createdAt;

  // Constructor y factory similar...
}
```

---

## Resumen de Pantallas Flutter

| Pantalla | Ubicación | Funcionalidad |
|----------|-----------|---------------|
| `StockManagerScreen` | Admin | Lista productos con stock |
| `StockDetailScreen` | Admin | Editar stock por variante |
| `ProductDetailScreen` | Cliente | Ver producto, seleccionar variante |
| Componente `VariantSelector` | Cliente | Selector color + talla con stock |
| Componente `StockNotifyForm` | Cliente | Formulario aviso stock |

---

## Notas Importantes

1. **El stock total del producto** (`products.stock`) debe ser la SUMA de todas las variantes
2. **Siempre mostrar stock** en los selectores de talla/color
3. **Permitir seleccionar tallas sin stock** para mostrar opción de notificación
4. **Solo usuarios logueados** pueden suscribirse a notificaciones
5. **Emails se envían automáticamente** cuando admin repone stock

---

## Ejemplo de Query Supabase

```dart
// Obtener stock de un producto
final stockData = await supabase
  .from('product_variant_stock')
  .select('size, color, stock')
  .eq('product_id', productId);

// Actualizar stock de variante (admin)
await supabase
  .from('product_variant_stock')
  .upsert({
    'product_id': productId,
    'size': size,
    'color': color,
    'stock': newStock,
  }, onConflict: 'product_id,size,color');

// Actualizar stock total del producto
final totalStock = stockData.fold<int>(0, (sum, v) => sum + (v['stock'] as int));
await supabase
  .from('products')
  .update({'stock': totalStock})
  .eq('id', productId);
```

---

Implementa estas funcionalidades siguiendo la estructura de mi aplicación Flutter existente. Asegúrate de manejar los casos edge (productos sin colores, variantes sin stock, usuario no logueado).
