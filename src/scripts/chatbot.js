/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET CHATBOT ENGINE
 * Sistema de chatbot sin IA externa - 100% basado en reglas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DATOS (se cargarán dinámicamente o se pueden incrustar)
// ═══════════════════════════════════════════════════════════════════════════════

const CATALOG = [
  { id: "prod-001", name: "Sudadera Oversize Premium", category: "sudadera", tags: ["oversize", "urbano", "invierno", "casual", "streetwear"], price: 49.99, sizes: ["S", "M", "L", "XL"], colors: ["negro", "gris", "blanco"], inStock: true, popularity: 98, description: "Ideal para looks urbanos de invierno", url: "/tienda" },
  { id: "prod-002", name: "Camiseta Básica Algodón", category: "camiseta", tags: ["básico", "casual", "verano", "minimalista", "esencial"], price: 19.99, sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["blanco", "negro", "gris", "azul marino"], inStock: true, popularity: 95, description: "Tu básico de armario perfecto", url: "/tienda" },
  { id: "prod-003", name: "Pantalón Chino Slim", category: "pantalon", tags: ["elegante", "trabajo", "casual", "primavera", "oficina"], price: 54.99, sizes: ["38", "40", "42", "44", "46"], colors: ["beige", "azul marino", "negro"], inStock: true, popularity: 82, description: "Perfecto para trabajo u ocasiones casuales", url: "/tienda?categoria=pantalones" },
  { id: "prod-004", name: "Blazer Slim Fit", category: "blazer", tags: ["elegante", "trabajo", "formal", "evento", "boda"], price: 99.99, sizes: ["S", "M", "L", "XL"], colors: ["azul marino", "negro", "gris"], inStock: true, popularity: 88, description: "Elegancia para eventos especiales", url: "/tienda?categoria=trajes" },
  { id: "prod-005", name: "Jogger Deportivo Tech", category: "pantalon", tags: ["deportivo", "gym", "casual", "cómodo", "running"], price: 39.99, sizes: ["S", "M", "L", "XL"], colors: ["negro", "gris", "azul"], inStock: true, popularity: 91, description: "Máxima comodidad para el gym", url: "/tienda?categoria=pantalones" },
  { id: "prod-006", name: "Camisa Oxford Classic", category: "camisa", tags: ["elegante", "trabajo", "formal", "clásico", "oficina"], price: 44.99, sizes: ["S", "M", "L", "XL", "XXL"], colors: ["blanco", "celeste", "rosa palo"], inStock: true, popularity: 85, description: "El clásico imprescindible para oficina", url: "/tienda?categoria=camisas" },
  { id: "prod-007", name: "Abrigo Largo Paño", category: "abrigo", tags: ["elegante", "invierno", "formal", "evento", "premium"], price: 149.99, sizes: ["S", "M", "L", "XL"], colors: ["negro", "camel", "gris"], inStock: true, popularity: 79, description: "Sofisticación para días fríos", url: "/tienda" },
  { id: "prod-008", name: "Polo Piqué Premium", category: "polo", tags: ["casual", "elegante", "verano", "golf", "smart casual"], price: 34.99, sizes: ["S", "M", "L", "XL"], colors: ["blanco", "negro", "azul marino", "verde"], inStock: true, popularity: 76, description: "Estilo smart casual para el día a día", url: "/tienda" },
  { id: "prod-009", name: "Sudadera Capucha Essential", category: "sudadera", tags: ["urbano", "casual", "invierno", "cómodo", "básico"], price: 45.99, sizes: ["S", "M", "L", "XL", "XXL"], colors: ["gris jaspeado", "negro", "azul navy"], inStock: true, popularity: 93, description: "Comodidad urbana cada día", url: "/tienda" },
  { id: "prod-010", name: "Traje Completo Modern", category: "traje", tags: ["formal", "elegante", "evento", "boda", "trabajo", "premium"], price: 219.99, sizes: ["46", "48", "50", "52", "54"], colors: ["negro", "azul marino", "gris antracita"], inStock: true, popularity: 74, description: "Para ocasiones que importan", url: "/tienda?categoria=trajes" },
  { id: "prod-011", name: "Camiseta Graphic Urban", category: "camiseta", tags: ["urbano", "casual", "streetwear", "joven", "tendencia"], price: 29.99, sizes: ["S", "M", "L", "XL"], colors: ["negro", "blanco"], inStock: true, popularity: 89, description: "Estilo street con actitud", url: "/tienda" },
  { id: "prod-012", name: "Bomber Jacket Retro", category: "chaqueta", tags: ["urbano", "casual", "otoño", "retro", "tendencia"], price: 89.99, sizes: ["S", "M", "L", "XL"], colors: ["negro", "verde oliva", "burdeos"], inStock: false, popularity: 84, description: "El icono urbano por excelencia", url: "/tienda" }
];

const FAQ = {
  envios: { keywords: ["envío", "envio", "entrega", "llegar", "tarda", "gastos", "shipping"], answer: "📦 <strong>Envíos:</strong> Gratis en pedidos +100€. Entrega en 2-4 días laborables en España.", link: "/envios" },
  devoluciones: { keywords: ["devolución", "devolucion", "devolver", "cambio", "cambiar", "reembolso"], answer: "🔄 <strong>Devoluciones:</strong> 30 días para devolver. Gratis en tienda, 4,95€ recogida a domicilio.", link: "/devoluciones" },
  pagos: { keywords: ["pago", "pagar", "tarjeta", "paypal", "bizum", "contrareembolso"], answer: "💳 <strong>Pagos:</strong> Tarjeta, PayPal, Bizum y contrareembolso. 100% seguro.", link: "/pagos" },
  tallas: { keywords: ["talla", "tallas", "medidas", "qué talla", "sizing", "mido"], answer: "📏 <strong>Guía de tallas:</strong> S (96-100cm), M (100-104cm), L (104-108cm), XL (108-112cm).", link: "/guia-de-tallas" },
  contacto: { keywords: ["contacto", "contactar", "teléfono", "email", "llamar"], answer: "📞 <strong>Contacto:</strong> hola@fashionmarket.com | WhatsApp: +34 612 345 678", link: "/contacto" },
  descuentos: { keywords: ["descuento", "oferta", "cupón", "código", "promoción", "rebajas"], answer: "🏷️ Suscríbete a la newsletter y consigue 10% en tu primera compra.", link: "/ofertas" }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DICCIONARIOS DE SINÓNIMOS
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_SYNONYMS = {
  sudadera: ["sudadera", "sudaderas", "hoodie", "hoodies", "buzo", "buzos", "jersey grueso"],
  camiseta: ["camiseta", "camisetas", "t-shirt", "tshirt", "tee", "playera", "remera"],
  pantalon: ["pantalón", "pantalon", "pantalones", "jogger", "joggers", "jeans", "vaquero", "chino", "chinos"],
  camisa: ["camisa", "camisas", "shirt"],
  blazer: ["blazer", "blazers", "americana", "americanas", "saco"],
  abrigo: ["abrigo", "abrigos", "coat", "parka", "anorak"],
  chaqueta: ["chaqueta", "chaquetas", "bomber", "cazadora", "jacket"],
  polo: ["polo", "polos"],
  traje: ["traje", "trajes", "suit", "suits", "terno"]
};

const STYLE_SYNONYMS = {
  urbano: ["urbano", "street", "streetwear", "callejero", "urban"],
  elegante: ["elegante", "formal", "clásico", "clasico", "sofisticado", "chic"],
  casual: ["casual", "informal", "diario", "cómodo", "comodo", "relajado"],
  deportivo: ["deportivo", "sport", "gym", "running", "fitness", "atlético"]
};

const OCCASION_SYNONYMS = {
  trabajo: ["trabajo", "oficina", "reunión", "reunion", "entrevista", "curro"],
  evento: ["evento", "fiesta", "boda", "celebración", "celebracion", "cena", "salir"],
  invierno: ["invierno", "frío", "frio", "abrigar", "fresco"],
  verano: ["verano", "calor", "playa", "vacaciones"],
  regalo: ["regalo", "regalar", "cumpleaños", "aniversario"]
};

const COLOR_SYNONYMS = {
  negro: ["negro", "negra", "black", "oscuro"],
  blanco: ["blanco", "blanca", "white", "claro"],
  gris: ["gris", "grey", "gray", "plomo"],
  azul: ["azul", "blue", "marino", "navy", "celeste"],
  verde: ["verde", "green", "oliva", "khaki"],
  beige: ["beige", "crema", "arena", "camel"],
  rojo: ["rojo", "burdeos", "granate", "vino"]
};

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL CHATBOT
// ═══════════════════════════════════════════════════════════════════════════════

const chatState = {
  lastIntent: null,
  filters: {},
  conversationHistory: []
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE EXTRACCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrae la categoría del texto
 */
function extractCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some(syn => lower.includes(syn))) {
      return category;
    }
  }
  return null;
}

/**
 * Extrae el estilo del texto
 */
function extractStyle(text) {
  const lower = text.toLowerCase();
  for (const [style, synonyms] of Object.entries(STYLE_SYNONYMS)) {
    if (synonyms.some(syn => lower.includes(syn))) {
      return style;
    }
  }
  return null;
}

/**
 * Extrae la ocasión del texto
 */
function extractOccasion(text) {
  const lower = text.toLowerCase();
  for (const [occasion, synonyms] of Object.entries(OCCASION_SYNONYMS)) {
    if (synonyms.some(syn => lower.includes(syn))) {
      return occasion;
    }
  }
  return null;
}

/**
 * Extrae el color del texto
 */
function extractColor(text) {
  const lower = text.toLowerCase();
  for (const [color, synonyms] of Object.entries(COLOR_SYNONYMS)) {
    if (synonyms.some(syn => lower.includes(syn))) {
      return color;
    }
  }
  return null;
}

/**
 * Extrae el presupuesto del texto
 */
function extractBudget(text) {
  const lower = text.toLowerCase();
  
  // "menos de X", "hasta X", "máximo X"
  let match = lower.match(/(?:menos de|hasta|máximo|maximo|por debajo de)\s*(\d+)/);
  if (match) return { max: parseInt(match[1]) };
  
  // "entre X y Y"
  match = lower.match(/entre\s*(\d+)\s*y\s*(\d+)/);
  if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
  
  // "más de X"
  match = lower.match(/(?:más de|mas de|desde)\s*(\d+)/);
  if (match) return { min: parseInt(match[1]) };
  
  // "barato" o "económico"
  if (lower.includes("barato") || lower.includes("económico") || lower.includes("economico")) {
    return { max: 40 };
  }
  
  return null;
}

/**
 * Extrae la talla del texto
 */
function extractSize(text) {
  const lower = text.toLowerCase();
  const match = lower.match(/\b(xs|s|m|l|xl|xxl|\d{2})\b/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extrae todos los filtros del texto
 */
function extractAllFilters(text) {
  return {
    category: extractCategory(text),
    style: extractStyle(text),
    occasion: extractOccasion(text),
    color: extractColor(text),
    budget: extractBudget(text),
    size: extractSize(text)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BÚSQUEDA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Busca productos según filtros
 */
function searchProducts(filters) {
  let results = CATALOG.filter(p => p.inStock);
  
  // Filtrar por categoría
  if (filters.category) {
    results = results.filter(p => p.category === filters.category);
  }
  
  // Filtrar por color
  if (filters.color) {
    results = results.filter(p => 
      p.colors.some(c => c.toLowerCase().includes(filters.color))
    );
  }
  
  // Filtrar por presupuesto
  if (filters.budget) {
    if (filters.budget.max) {
      results = results.filter(p => p.price <= filters.budget.max);
    }
    if (filters.budget.min) {
      results = results.filter(p => p.price >= filters.budget.min);
    }
  }
  
  // Filtrar por talla
  if (filters.size) {
    results = results.filter(p => 
      p.sizes.some(s => s.toUpperCase() === filters.size)
    );
  }
  
  // Puntuar y ordenar
  results = results.map(p => {
    let score = p.popularity;
    
    // Bonus por estilo
    if (filters.style && p.tags.includes(filters.style)) {
      score += 30;
    }
    
    // Bonus por ocasión
    if (filters.occasion && p.tags.some(t => t.includes(filters.occasion))) {
      score += 25;
    }
    
    return { ...p, score };
  });
  
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Obtiene productos populares
 */
function getPopularProducts(count = 3) {
  return CATALOG
    .filter(p => p.inStock)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECCIÓN DE INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detecta la intención del mensaje
 */
function detectIntent(text) {
  const lower = text.toLowerCase();
  
  // Saludos
  if (/^(hola|hey|buenas|buenos días|qué tal|hi|hello)/i.test(lower)) {
    return "greeting";
  }
  
  // Agradecimientos
  if (/(gracias|genial|perfecto|vale|ok|entendido|guay)/i.test(lower)) {
    return "thanks";
  }
  
  // Ayuda general
  if (/(ayuda|ayúdame|help|qué puedes|que puedes)/i.test(lower)) {
    return "help";
  }
  
  // Categorías / ver todo
  if (/(categoría|categoria|categorías|ver todo|catálogo|catalogo|novedades)/i.test(lower)) {
    return "browse";
  }
  
  // FAQ
  for (const [key, faq] of Object.entries(FAQ)) {
    if (faq.keywords.some(kw => lower.includes(kw))) {
      return { type: "faq", key };
    }
  }
  
  // Búsqueda de productos
  const filters = extractAllFilters(text);
  if (filters.category || filters.style || filters.occasion || filters.color || 
      /(busco|quiero|necesito|buscando|dame|muéstrame|recomienda)/i.test(lower)) {
    return { type: "search", filters };
  }
  
  return "unknown";
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR DE RESPUESTAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Procesa el mensaje del usuario y genera respuesta
 */
function processMessage(userMessage) {
  const intent = detectIntent(userMessage);
  
  // Guardar en historial
  chatState.conversationHistory.push({ role: "user", content: userMessage });
  
  let response = { text: "", chips: null, products: null };
  
  // Saludo
  if (intent === "greeting") {
    response.text = "¡Hola! 👋 Soy tu asistente de FashionMarket. ¿Qué buscas hoy?";
    response.chips = ["Ver novedades", "Categorías", "Ayuda"];
    chatState.lastIntent = "greeting";
  }
  
  // Agradecimiento
  else if (intent === "thanks") {
    response.text = "¡De nada! 🙌 Aquí estoy si necesitas algo más.";
    response.chips = ["Seguir mirando", "Ver novedades"];
  }
  
  // Ayuda
  else if (intent === "help") {
    response.text = "Puedo ayudarte con:<br><br>🛒 <strong>Buscar ropa</strong> — \"quiero una sudadera negra\"<br>📦 <strong>Envíos y devoluciones</strong><br>📏 <strong>Guía de tallas</strong><br>💳 <strong>Formas de pago</strong>";
    response.chips = ["Ver novedades", "Envíos", "Tallas"];
  }
  
  // Navegar / categorías
  else if (intent === "browse") {
    const popular = getPopularProducts(3);
    response.text = "✨ Estas son nuestras prendas más populares ahora mismo:";
    response.products = popular;
    response.chips = ["Camisetas", "Sudaderas", "Pantalones"];
  }
  
  // FAQ
  else if (intent.type === "faq") {
    const faq = FAQ[intent.key];
    response.text = faq.answer;
    if (faq.link) {
      response.text += ` <a href="${faq.link}" class="chatbot-link">Más info →</a>`;
    }
    response.chips = ["Otra pregunta", "Ver productos"];
  }
  
  // Búsqueda de productos
  else if (intent.type === "search") {
    const filters = { ...chatState.filters, ...intent.filters };
    chatState.filters = filters;
    
    const results = searchProducts(filters);
    
    if (results.length === 0) {
      const alternatives = getPopularProducts(3);
      response.text = "No encontré coincidencias exactas, pero te pueden gustar estos:";
      response.products = alternatives;
      response.chips = ["Ver todo", "Cambiar filtros"];
    } 
    else if (results.length > 4 && !filters.category) {
      response.text = "Tengo varias opciones. ¿Qué tipo de prenda prefieres?";
      response.chips = ["Camisetas", "Sudaderas", "Pantalones", "Camisas"];
      chatState.lastIntent = "awaiting_category";
    }
    else {
      const top = results.slice(0, 4);
      response.text = results.length === 1 
        ? "🎯 ¡Encontré esto perfecto para ti!"
        : `🔍 Encontré ${results.length} opciones. Te muestro las mejores:`;
      response.products = top;
      chatState.filters = {}; // Reset filters
    }
  }
  
  // No entendido
  else {
    const popular = getPopularProducts(2);
    response.text = "No estoy seguro de entenderte. ¿Te ayudo con algo de esto?";
    response.products = popular;
    response.chips = ["Ver categorías", "Ayuda", "Envíos"];
  }
  
  // Guardar respuesta en historial
  chatState.conversationHistory.push({ role: "bot", content: response.text });
  
  return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MENSAJE INICIAL
// ═══════════════════════════════════════════════════════════════════════════════

function getWelcomeMessage() {
  return {
    text: "¡Hola! 👋 Soy tu asistente de FashionMarket. ¿Qué buscas hoy?",
    chips: ["Ver novedades", "Categorías", "Ayuda"],
    products: null
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════════════════════════

window.ChatbotEngine = {
  processMessage,
  getWelcomeMessage,
  getPopularProducts,
  searchProducts
};
