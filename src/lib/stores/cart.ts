/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Cart Store (Nano Stores)
 * Manejo de estado persistente del carrito de compras
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
  image: string;
  maxStock: number;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// Estado inicial - intentar recuperar del localStorage
const getInitialState = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem('fashionmarket-cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Atom para los items del carrito
export const cartItems = atom<CartItem[]>(getInitialState());

// Atom para controlar visibilidad del slide-over
export const isCartOpen = atom<boolean>(false);

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
export function addToCart(product: Product, size: string, quantity: number = 1): void {
  const currentItems = cartItems.get();
  
  // Buscar si ya existe este producto con esta talla
  const existingIndex = currentItems.findIndex(
    (item) => item.productId === product.id && item.size === size
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
      image: product.images[0] || '/placeholder.jpg',
      maxStock: product.stock,
    };
    newItems = [...currentItems, newItem];
  }
  
  cartItems.set(newItems);
  persistCart(newItems);
  
  // Abrir el carrito automáticamente
  isCartOpen.set(true);
}

/**
 * Eliminar item del carrito
 */
export function removeFromCart(productId: string, size: string): void {
  const newItems = cartItems.get().filter(
    (item) => !(item.productId === productId && item.size === size)
  );
  
  cartItems.set(newItems);
  persistCart(newItems);
}

/**
 * Actualizar cantidad de un item
 */
export function updateQuantity(productId: string, size: string, quantity: number): void {
  if (quantity < 1) {
    removeFromCart(productId, size);
    return;
  }
  
  const newItems = cartItems.get().map((item) => {
    if (item.productId === productId && item.size === size) {
      return { ...item, quantity: Math.min(quantity, item.maxStock) };
    }
    return item;
  });
  
  cartItems.set(newItems);
  persistCart(newItems);
}

/**
 * Vaciar carrito completamente
 */
export function clearCart(): void {
  cartItems.set([]);
  persistCart([]);
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persistir carrito en localStorage
 */
function persistCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  
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
 */
export function initializeCart(): void {
  if (typeof window === 'undefined') return;
  
  const saved = getInitialState();
  if (saved.length > 0) {
    cartItems.set(saved);
  }
}
