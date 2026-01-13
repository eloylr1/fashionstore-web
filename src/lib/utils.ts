/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Utility Functions
 * Funciones helper reutilizables en toda la aplicación
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// FORMATEO DE PRECIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formatea un precio de céntimos a moneda local (EUR)
 * @param cents - Precio en céntimos
 * @returns Precio formateado (ej: "59,99 €")
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/**
 * Formatea un precio con símbolo personalizado
 * @param amount - Cantidad
 * @param currency - Código de moneda
 * @returns Precio formateado
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera un slug a partir de un texto
 * @param text - Texto a convertir
 * @returns Slug URL-friendly
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .trim()
    .replace(/^-+|-+$/g, ''); // Remover guiones al inicio/final
}

/**
 * Trunca un texto a una longitud máxima
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima
 * @param suffix - Sufijo a añadir (default: '...')
 * @returns Texto truncado
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Capitaliza la primera letra de cada palabra
 * @param text - Texto a capitalizar
 * @returns Texto capitalizado
 */
export function capitalize(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// FECHAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha en formato legible
 * @param date - Fecha a formatear
 * @param options - Opciones de formateo
 * @returns Fecha formateada
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', options).format(d);
}

/**
 * Calcula tiempo relativo (hace X tiempo)
 * @param date - Fecha a comparar
 * @returns Tiempo relativo
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals = [
    { label: 'año', seconds: 31536000 },
    { label: 'mes', seconds: 2592000 },
    { label: 'semana', seconds: 604800 },
    { label: 'día', seconds: 86400 },
    { label: 'hora', seconds: 3600 },
    { label: 'minuto', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      const plural = count !== 1 ? (interval.label === 'mes' ? 'es' : 's') : '';
      return `hace ${count} ${interval.label}${plural}`;
    }
  }

  return 'hace unos segundos';
}

// ─────────────────────────────────────────────────────────────────────────────
// ARRAYS Y OBJETOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agrupa un array por una clave
 * @param array - Array a agrupar
 * @param key - Clave por la cual agrupar
 * @returns Objeto con grupos
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    return {
      ...groups,
      [groupKey]: [...(groups[groupKey] || []), item],
    };
  }, {} as Record<string, T[]>);
}

/**
 * Elimina duplicados de un array
 * @param array - Array con posibles duplicados
 * @param key - Clave para comparar (opcional)
 * @returns Array sin duplicados
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida formato de email
 * @param email - Email a validar
 * @returns true si es válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de teléfono español
 * @param phone - Teléfono a validar
 * @returns true si es válido
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+34)?[6-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// ─────────────────────────────────────────────────────────────────────────────
// MISCELÁNEOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera un ID único
 * @returns ID único
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Espera un tiempo determinado (útil para testing)
 * @param ms - Milisegundos a esperar
 * @returns Promise que se resuelve después del tiempo
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Combina clases CSS de forma segura
 * @param classes - Clases a combinar
 * @returns String con clases combinadas
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
