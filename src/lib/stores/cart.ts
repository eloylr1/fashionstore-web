/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Cart Store (Nano Stores) v3
 * Manejo de estado persistente del carrito con sincronización por usuario
 * - Invitados: sessionStorage (persiste durante navegación, se elimina al cerrar navegador)
 * - Usuarios logueados: localStorage + sincronizado con BD (persiste siempre)
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
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const CART_KEY = 'fashionmarket-cart';
const GUEST_CART_KEY = 'fashionmarket-cart-guest';

// ─────────────────────────────────────────────────────────────────────────────
// STORE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// Estado inicial - Cargar desde sessionStorage para invitados
const getInitialState = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  
  // Intentar cargar carrito de invitado desde sessionStorage
  try {
    const guestCart = sessionStorage.getItem(GUEST_CART_KEY);
    if (guestCart) {
      return JSON.parse(guestCart);
    }
  } catch {
    // Ignorar errores de parsing
  }
  
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
        
        // Mostrar notificación SOLO si es la primera vez en esta sesión
        // y si el usuario acaba de iniciar sesión (no en cada navegación)
        const welcomeShown = sessionStorage.getItem('fashionmarket-welcome-shown');
        if (!welcomeShown) {
          sessionStorage.setItem('fashionmarket-welcome-shown', 'true');
          showCartNotification({
            type: 'restored',
            message: `¡Bienvenido de vuelta! Tienes ${mergedItems.length} artículo${mergedItems.length > 1 ? 's' : ''} en tu carrito.`,
            itemCount: mergedItems.length,
          });
        }
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
 * Persistir carrito en storage
 * - Invitados: sessionStorage (se elimina al cerrar el navegador)
 * - Usuarios logueados: localStorage (persiste siempre)
 */
function persistCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  
  const userId = currentUserId.get();
  
  try {
    if (userId) {
      // Usuario logueado: guardar en localStorage (persiste siempre)
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      // Limpiar sessionStorage de invitado si existía
      sessionStorage.removeItem(GUEST_CART_KEY);
    } else {
      // Invitado: guardar en sessionStorage (se elimina al cerrar navegador)
      sessionStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  } catch (error) {
    console.error('Error saving cart to storage:', error);
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
 * Carga inmediatamente desde sessionStorage para invitados
 * y luego verifica sesión para usuarios logueados
 */
export function initializeCart(): void {
  if (typeof window === 'undefined') return;
  
  // PRIMERO: Cargar inmediatamente desde sessionStorage (para invitados)
  // Esto asegura que el carrito se muestre instantáneamente al navegar
  const guestCart = loadCartFromSessionStorage();
  if (guestCart.length > 0 && cartItems.get().length === 0) {
    cartItems.set(guestCart);
  }
  
  // LUEGO: Verificar si hay usuario logueado y sincronizar
  checkAndLoadUserCart();
}

/**
 * Cargar carrito desde localStorage (solo para usuarios logueados)
 */
function loadCartFromLocalStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Cargar carrito desde sessionStorage (para invitados)
 */
function loadCartFromSessionStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = sessionStorage.getItem(GUEST_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Verificar sesión y cargar carrito del usuario
 * - Usuarios logueados: cargar desde localStorage
 * - Invitados: mantener sessionStorage (ya cargado en getInitialState)
 */
async function checkAndLoadUserCart(): Promise<void> {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      // Usuario no logueado - carrito en sessionStorage (persiste durante navegación)
      const guestCart = loadCartFromSessionStorage();
      if (guestCart.length > 0) {
        cartItems.set(guestCart);
      }
      console.log('Guest user - cart stored in sessionStorage (clears when browser closes)');
      return;
    }
    
    const data = await response.json();
    
    if (data.user?.id) {
      currentUserId.set(data.user.id);
      
      // Usuario logueado - cargar desde localStorage primero
      const savedItems = loadCartFromLocalStorage();
      
      // También verificar si hay items de sesión de invitado para fusionar
      const guestItems = loadCartFromSessionStorage();
      
      if (guestItems.length > 0 && savedItems.length === 0) {
        // Si hay carrito de invitado pero no de usuario, usar el de invitado
        cartItems.set(guestItems);
        persistCart(guestItems); // Guardará en localStorage
        // Limpiar sessionStorage
        sessionStorage.removeItem(GUEST_CART_KEY);
      } else if (savedItems.length > 0) {
        cartItems.set(savedItems);
      }
      
      // Limpiar sessionStorage de invitado si existía
      sessionStorage.removeItem(GUEST_CART_KEY);
      
      // Luego sincronizar con el servidor
      await loadCartFromServer();
    } else {
      // Usuario no logueado - carrito en sessionStorage
      const guestCart = loadCartFromSessionStorage();
      if (guestCart.length > 0) {
        cartItems.set(guestCart);
      }
      console.log('Guest user - cart stored in sessionStorage (clears when browser closes)');
    }
  } catch (error) {
    // Usuario no logueado, carrito en sessionStorage
    const guestCart = loadCartFromSessionStorage();
    if (guestCart.length > 0) {
      cartItems.set(guestCart);
    }
    console.log('Using guest cart (sessionStorage - clears when browser closes)');
  }
}
