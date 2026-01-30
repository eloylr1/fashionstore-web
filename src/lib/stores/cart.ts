/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Cart Store (Nano Stores) v2
 * Manejo de estado persistente del carrito con sincronización por usuario
 * - Invitados: carrito TEMPORAL (no se guarda en localStorage)
 * - Usuarios logueados: persistido en localStorage + sincronizado con BD
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { atom, computed } from 'nanostores';
import type { Product } from '../supabase/database.types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number; // En céntimos
  quantity: number;
  size: string;
  color?: string; // Color seleccionado (opcional para compatibilidad)
  image: string;
  maxStock: number;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

export interface CartNotification {
  type: 'welcome' | 'restored' | 'added';
  message: string;
  itemCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// Estado inicial - NO cargar desde localStorage aquí
// Solo se cargará cuando se verifique que hay sesión activa
const getInitialState = (): CartItem[] => {
  // No cargar nada al inicio - se cargará después de verificar autenticación
  return [];
};

// Atom para los items del carrito
export const cartItems = atom<CartItem[]>(getInitialState());

// Atom para controlar visibilidad del slide-over
export const isCartOpen = atom<boolean>(false);

// Atom para el ID del usuario logueado (para saber si sincronizar con DB)
export const currentUserId = atom<string | null>(null);

// Atom para notificaciones del carrito
export const cartNotification = atom<CartNotification | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED VALUES (valores derivados)
// ─────────────────────────────────────────────────────────────────────────────

// Cantidad total de items
export const cartCount = computed(cartItems, (items) =>
  items.reduce((total, item) => total + item.quantity, 0)
);

// Subtotal en céntimos
export const cartSubtotal = computed(cartItems, (items) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0)
);

// Subtotal formateado en euros
export const cartSubtotalFormatted = computed(cartSubtotal, (subtotal) =>
  formatPrice(subtotal)
);

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS (mutaciones del estado)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Añadir producto al carrito
 */
export function addToCart(product: Product, size: string, quantity: number = 1, color?: string): void {
  const currentItems = cartItems.get();
  
  // Buscar si ya existe este producto con esta talla y color
  const existingIndex = currentItems.findIndex(
    (item) => item.productId === product.id && item.size === size && item.color === color
  );
  
  let newItems: CartItem[];
  
  if (existingIndex > -1) {
    // Actualizar cantidad si ya existe
    newItems = currentItems.map((item, index) => {
      if (index === existingIndex) {
        const newQuantity = Math.min(item.quantity + quantity, item.maxStock);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
  } else {
    // Añadir nuevo item
    const newItem: CartItem = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity: Math.min(quantity, product.stock),
      size,
      color,
      image: product.images[0] || '/placeholder.jpg',
      maxStock: product.stock,
    };
    newItems = [...currentItems, newItem];
  }
  
  cartItems.set(newItems);
  persistCart(newItems);
  syncCartToServer(newItems);
  
  // Abrir el carrito automáticamente
  isCartOpen.set(true);
}

/**
 * Eliminar item del carrito
 */
export function removeFromCart(productId: string, size: string, color?: string): void {
  const newItems = cartItems.get().filter(
    (item) => !(item.productId === productId && item.size === size && item.color === color)
  );
  
  cartItems.set(newItems);
  persistCart(newItems);
  syncCartToServer(newItems);
}

/**
 * Actualizar cantidad de un item
 */
export function updateQuantity(productId: string, size: string, quantity: number, color?: string): void {
  if (quantity < 1) {
    removeFromCart(productId, size, color);
    return;
  }
  
  const newItems = cartItems.get().map((item) => {
    if (item.productId === productId && item.size === size && item.color === color) {
      return { ...item, quantity: Math.min(quantity, item.maxStock) };
    }
    return item;
  });
  
  cartItems.set(newItems);
  persistCart(newItems);
  syncCartToServer(newItems);
}

/**
 * Vaciar carrito completamente
 */
export function clearCart(): void {
  cartItems.set([]);
  persistCart([]);
  syncCartToServer([]);
}

/**
 * Abrir/cerrar el slide-over del carrito
 */
export function toggleCart(): void {
  isCartOpen.set(!isCartOpen.get());
}

export function openCart(): void {
  isCartOpen.set(true);
}

export function closeCart(): void {
  isCartOpen.set(false);
}

/**
 * Mostrar notificación del carrito
 */
export function showCartNotification(notification: CartNotification): void {
  cartNotification.set(notification);
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    cartNotification.set(null);
  }, 5000);
}

/**
 * Ocultar notificación
 */
export function hideCartNotification(): void {
  cartNotification.set(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZACIÓN CON SERVIDOR (para usuarios logueados)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sincronizar carrito al servidor
 */
async function syncCartToServer(items: CartItem[]): Promise<void> {
  const userId = currentUserId.get();
  if (!userId) return; // Solo sincronizar si hay usuario logueado
  
  try {
    await fetch('/api/cart/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  } catch (error) {
    console.error('Error syncing cart to server:', error);
  }
}

/**
 * Cargar carrito del servidor (al hacer login)
 */
export async function loadCartFromServer(): Promise<void> {
  try {
    const response = await fetch('/api/cart/get');
    if (!response.ok) return;
    
    const data = await response.json();
    
    if (data.items && Array.isArray(data.items)) {
      const localItems = cartItems.get();
      
      // Convertir items del servidor al formato del carrito
      const serverItems: CartItem[] = data.items.map((item: any) => ({
        productId: item.product_id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        image: item.image || '/placeholder.jpg',
        maxStock: item.stock || 99,
      }));
      
      // Merge: combinar items locales con los del servidor
      const mergedItems = mergeCartItems(localItems, serverItems);
      
      cartItems.set(mergedItems);
      persistCart(mergedItems);
      
      // Sincronizar el resultado de vuelta al servidor
      if (mergedItems.length > 0) {
        await syncCartToServer(mergedItems);
        
        // Mostrar notificación si había items en el carrito
        showCartNotification({
          type: 'restored',
          message: `¡Bienvenido de vuelta! Tienes ${mergedItems.length} artículo${mergedItems.length > 1 ? 's' : ''} en tu carrito.`,
          itemCount: mergedItems.length,
        });
      }
      
      // Guardar userId
      if (data.userId) {
        currentUserId.set(data.userId);
      }
    }
  } catch (error) {
    console.error('Error loading cart from server:', error);
  }
}

/**
 * Combinar items locales con los del servidor
 */
function mergeCartItems(localItems: CartItem[], serverItems: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  
  // Primero añadir items del servidor
  for (const item of serverItems) {
    const key = `${item.productId}-${item.size}`;
    merged.set(key, item);
  }
  
  // Luego añadir/actualizar con items locales (toma la cantidad mayor)
  for (const item of localItems) {
    const key = `${item.productId}-${item.size}`;
    const existing = merged.get(key);
    
    if (existing) {
      // Tomar la cantidad mayor
      merged.set(key, {
        ...item,
        quantity: Math.max(item.quantity, existing.quantity),
      });
    } else {
      merged.set(key, item);
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Limpiar carrito al cerrar sesión
 * Borra el carrito tanto de memoria como de localStorage
 */
export function clearCartForGuest(): void {
  // Limpiar el carrito de memoria y localStorage
  cartItems.set([]);
  currentUserId.set(null);
  
  // Limpiar localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('fashionmarket-cart');
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  }
}

/**
 * Inicializar carrito para usuario invitado
 * Carrito vacío y temporal (no se persiste)
 */
export function initializeGuestCart(): void {
  cartItems.set([]);
  currentUserId.set(null);
  
  // Limpiar cualquier carrito guardado previamente
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('fashionmarket-cart');
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persistir carrito en localStorage
 * SOLO si el usuario está logueado
 */
function persistCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  
  const userId = currentUserId.get();
  
  // Solo guardar en localStorage si hay usuario logueado
  if (!userId) {
    // Para invitados, no persistimos - el carrito es temporal
    return;
  }
  
  try {
    localStorage.setItem('fashionmarket-cart', JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

/**
 * Formatear precio de céntimos a euros
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/**
 * Inicializar carrito (llamar en el cliente)
 * Solo carga desde localStorage si hay usuario logueado
 */
export function initializeCart(): void {
  if (typeof window === 'undefined') return;
  
  // Verificar si hay usuario logueado y cargar su carrito
  // NO cargamos nada de localStorage hasta verificar la sesión
  checkAndLoadUserCart();
}

/**
 * Cargar carrito desde localStorage (solo para usuarios logueados)
 */
function loadCartFromLocalStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem('fashionmarket-cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Verificar sesión y cargar carrito del usuario
 * Solo carga el carrito si el usuario está logueado
 */
async function checkAndLoadUserCart(): Promise<void> {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      // Usuario no logueado - carrito vacío (no persistente)
      console.log('Guest user - cart is temporary and will not be saved');
      return;
    }
    
    const data = await response.json();
    
    if (data.user?.id) {
      currentUserId.set(data.user.id);
      
      // Usuario logueado - cargar desde localStorage primero
      const savedItems = loadCartFromLocalStorage();
      if (savedItems.length > 0) {
        cartItems.set(savedItems);
      }
      
      // Luego sincronizar con el servidor
      await loadCartFromServer();
    } else {
      // Usuario no logueado - carrito vacío (temporal)
      console.log('Guest user - cart is temporary and will not be saved');
    }
  } catch (error) {
    // Usuario no logueado, carrito temporal
    console.log('Using guest cart (temporary - not saved)');
  }
}
