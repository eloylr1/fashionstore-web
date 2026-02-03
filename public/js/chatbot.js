/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET CHATBOT ENGINE v2.0
 * Sistema de chatbot interactivo sin IA externa
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE PRODUCTOS CON IMÁGENES
// ═══════════════════════════════════════════════════════════════════════════════

var CATALOG = [
  { 
    id: "prod-001", 
    name: "Sudadera Oversize Premium", 
    category: "sudadera", 
    tags: ["oversize", "urbano", "invierno", "casual", "streetwear", "nuevo"], 
    price: 49.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["negro", "gris", "blanco"], 
    inStock: true, 
    popularity: 98, 
    description: "Ideal para looks urbanos", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&h=300&fit=crop",
    badge: "NUEVO"
  },
  { 
    id: "prod-002", 
    name: "Camiseta Básica Algodón", 
    category: "camiseta", 
    tags: ["básico", "casual", "verano", "minimalista", "esencial"], 
    price: 19.99, 
    sizes: ["XS", "S", "M", "L", "XL", "XXL"], 
    colors: ["blanco", "negro", "gris", "azul marino"], 
    inStock: true, 
    popularity: 95, 
    description: "Básico de armario perfecto", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
    badge: "TOP"
  },
  { 
    id: "prod-003", 
    name: "Pantalón Chino Slim", 
    category: "pantalon", 
    tags: ["elegante", "trabajo", "casual", "primavera", "oficina"], 
    price: 54.99, 
    sizes: ["38", "40", "42", "44", "46"], 
    colors: ["beige", "azul marino", "negro"], 
    inStock: true, 
    popularity: 82, 
    description: "Perfecto para trabajo", 
    url: "/tienda?categoria=pantalones",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=300&h=300&fit=crop",
    badge: null
  },
  { 
    id: "prod-004", 
    name: "Blazer Azul Casual", 
    category: "blazer", 
    tags: ["elegante", "trabajo", "formal", "evento", "boda", "nuevo"], 
    price: 149.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["azul marino", "negro", "gris"], 
    inStock: true, 
    popularity: 88, 
    description: "Elegancia para eventos", 
    url: "/tienda?categoria=trajes",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&h=300&fit=crop",
    badge: "NUEVO"
  },
  { 
    id: "prod-005", 
    name: "Jogger Deportivo Tech", 
    category: "pantalon", 
    tags: ["deportivo", "gym", "casual", "cómodo", "running"], 
    price: 39.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["negro", "gris", "azul"], 
    inStock: true, 
    popularity: 91, 
    description: "Máxima comodidad gym", 
    url: "/tienda?categoria=pantalones",
    image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=300&h=300&fit=crop",
    badge: "TOP"
  },
  { 
    id: "prod-006", 
    name: "Camisa Oxford Blanca", 
    category: "camisa", 
    tags: ["elegante", "trabajo", "formal", "clásico", "oficina"], 
    price: 59.99, 
    sizes: ["S", "M", "L", "XL", "XXL"], 
    colors: ["blanco", "celeste", "rosa palo"], 
    inStock: true, 
    popularity: 85, 
    description: "Clásico imprescindible", 
    url: "/tienda?categoria=camisas",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop",
    badge: "TOP"
  },
  { 
    id: "prod-007", 
    name: "Abrigo Largo Premium", 
    category: "abrigo", 
    tags: ["elegante", "invierno", "formal", "evento", "premium"], 
    price: 189.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["negro", "camel", "gris"], 
    inStock: true, 
    popularity: 79, 
    description: "Sofisticación días fríos", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=300&h=300&fit=crop",
    badge: "PREMIUM"
  },
  { 
    id: "prod-008", 
    name: "Polo Piqué Classic", 
    category: "polo", 
    tags: ["casual", "elegante", "verano", "golf", "smart casual"], 
    price: 34.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["blanco", "negro", "azul marino", "verde"], 
    inStock: true, 
    popularity: 76, 
    description: "Smart casual día a día", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=300&h=300&fit=crop",
    badge: null
  },
  { 
    id: "prod-009", 
    name: "Sudadera Capucha Essential", 
    category: "sudadera", 
    tags: ["urbano", "casual", "invierno", "cómodo", "básico"], 
    price: 45.99, 
    sizes: ["S", "M", "L", "XL", "XXL"], 
    colors: ["gris jaspeado", "negro", "azul navy"], 
    inStock: true, 
    popularity: 93, 
    description: "Comodidad urbana", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=300&h=300&fit=crop",
    badge: "TOP"
  },
  { 
    id: "prod-010", 
    name: "Traje Completo Modern", 
    category: "traje", 
    tags: ["formal", "elegante", "evento", "boda", "trabajo", "premium"], 
    price: 279.99, 
    sizes: ["46", "48", "50", "52", "54"], 
    colors: ["negro", "azul marino", "gris antracita"], 
    inStock: true, 
    popularity: 74, 
    description: "Para ocasiones especiales", 
    url: "/tienda?categoria=trajes",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&h=300&fit=crop",
    badge: "PREMIUM"
  },
  { 
    id: "prod-011", 
    name: "Camiseta Graphic Urban", 
    category: "camiseta", 
    tags: ["urbano", "casual", "streetwear", "joven", "tendencia", "nuevo"], 
    price: 29.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["negro", "blanco"], 
    inStock: true, 
    popularity: 89, 
    description: "Estilo street con actitud", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300&h=300&fit=crop",
    badge: "NUEVO"
  },
  { 
    id: "prod-012", 
    name: "Bomber Jacket Retro", 
    category: "chaqueta", 
    tags: ["urbano", "casual", "otoño", "retro", "tendencia"], 
    price: 89.99, 
    sizes: ["S", "M", "L", "XL"], 
    colors: ["negro", "verde oliva", "burdeos"], 
    inStock: true, 
    popularity: 84, 
    description: "Icono urbano retro", 
    url: "/tienda",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&h=300&fit=crop",
    badge: "TENDENCIA"
  }
];

var FAQ = {
  envios: { keywords: ["envío", "envio", "entrega", "llegar", "tarda", "gastos", "shipping", "cuánto tarda"], answer: "📦 <strong>Envíos:</strong> Gratis en pedidos +100€. Entrega en 2-4 días laborables en España.", link: "/envios" },
  devoluciones: { keywords: ["devolución", "devolucion", "devolver", "cambio", "cambiar", "reembolso"], answer: "🔄 <strong>Devoluciones:</strong> 30 días para devolver. Gratis en tienda, 4,95€ recogida a domicilio.", link: "/devoluciones" },
  pagos: { keywords: ["pago", "pagar", "tarjeta", "paypal", "bizum", "contrareembolso"], answer: "💳 <strong>Pagos:</strong> Tarjeta, PayPal, Bizum y contrareembolso. 100% seguro.", link: "/pagos" },
  tallas: { keywords: ["talla", "tallas", "medidas", "qué talla", "sizing", "mido", "guía"], answer: "📏 <strong>Guía de tallas:</strong> S (96-100cm), M (100-104cm), L (104-108cm), XL (108-112cm).", link: "/guia-de-tallas" },
  contacto: { keywords: ["contacto", "contactar", "teléfono", "email", "llamar", "whatsapp"], answer: "📞 <strong>Contacto:</strong> hola@fashionmarket.com | WhatsApp: +34 612 345 678", link: "/contacto" },
  descuentos: { keywords: ["descuento", "oferta", "cupón", "código", "promoción", "rebajas"], answer: "🏷️ Suscríbete a la newsletter y consigue 10% en tu primera compra.", link: "/ofertas" }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DICCIONARIOS
// ═══════════════════════════════════════════════════════════════════════════════

var CATEGORY_SYNONYMS = {
  sudadera: ["sudadera", "sudaderas", "hoodie", "hoodies", "buzo"],
  camiseta: ["camiseta", "camisetas", "t-shirt", "tshirt", "playera"],
  pantalon: ["pantalón", "pantalon", "pantalones", "jogger", "jeans", "chino"],
  camisa: ["camisa", "camisas", "shirt"],
  blazer: ["blazer", "blazers", "americana"],
  abrigo: ["abrigo", "abrigos", "coat", "parka"],
  chaqueta: ["chaqueta", "chaquetas", "bomber", "cazadora"],
  polo: ["polo", "polos"],
  traje: ["traje", "trajes", "suit", "terno"]
};

var STYLE_SYNONYMS = {
  urbano: ["urbano", "street", "streetwear", "urban"],
  elegante: ["elegante", "formal", "clásico", "sofisticado"],
  casual: ["casual", "informal", "diario", "cómodo"],
  deportivo: ["deportivo", "sport", "gym", "running"]
};

var OCCASION_SYNONYMS = {
  trabajo: ["trabajo", "oficina", "reunión", "entrevista"],
  evento: ["evento", "fiesta", "boda", "cena", "noche"],
  diario: ["diario", "día a día", "cotidiano"],
  verano: ["verano", "calor", "playa"],
  invierno: ["invierno", "frío", "frio"]
};

var COLOR_SYNONYMS = {
  negro: ["negro", "black", "oscuro"],
  blanco: ["blanco", "white", "claro"],
  azul: ["azul", "blue", "navy", "marino"],
  gris: ["gris", "grey", "gray"],
  beige: ["beige", "crema", "camel"],
  verde: ["verde", "green", "oliva"]
};

// Estado
var chatState = { filters: {}, lastResults: [] };

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE EXTRACCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function extractCategory(text) {
  var lower = text.toLowerCase();
  for (var cat in CATEGORY_SYNONYMS) {
    var syns = CATEGORY_SYNONYMS[cat];
    for (var i = 0; i < syns.length; i++) {
      if (lower.indexOf(syns[i]) >= 0) return cat;
    }
  }
  return null;
}

function extractStyle(text) {
  var lower = text.toLowerCase();
  for (var style in STYLE_SYNONYMS) {
    var syns = STYLE_SYNONYMS[style];
    for (var i = 0; i < syns.length; i++) {
      if (lower.indexOf(syns[i]) >= 0) return style;
    }
  }
  return null;
}

function extractOccasion(text) {
  var lower = text.toLowerCase();
  for (var occ in OCCASION_SYNONYMS) {
    var syns = OCCASION_SYNONYMS[occ];
    for (var i = 0; i < syns.length; i++) {
      if (lower.indexOf(syns[i]) >= 0) return occ;
    }
  }
  return null;
}

function extractColor(text) {
  var lower = text.toLowerCase();
  for (var color in COLOR_SYNONYMS) {
    var syns = COLOR_SYNONYMS[color];
    for (var i = 0; i < syns.length; i++) {
      if (lower.indexOf(syns[i]) >= 0) return color;
    }
  }
  return null;
}

function extractBudget(text) {
  var match = text.match(/(\d+)\s*€|menos de (\d+)|hasta (\d+)|máximo (\d+)/i);
  if (match) {
    for (var i = 1; i <= 4; i++) {
      if (match[i]) return parseInt(match[i]);
    }
  }
  return null;
}

function extractAllFilters(text) {
  return {
    category: extractCategory(text),
    style: extractStyle(text),
    occasion: extractOccasion(text),
    color: extractColor(text),
    maxPrice: extractBudget(text)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BÚSQUEDA
// ═══════════════════════════════════════════════════════════════════════════════

function searchProducts(filters) {
  var results = [];
  
  for (var i = 0; i < CATALOG.length; i++) {
    var p = CATALOG[i];
    if (!p.inStock) continue;
    
    var score = 0;
    var matches = true;
    
    if (filters.category && p.category !== filters.category) matches = false;
    else if (filters.category) score += 50;
    
    if (filters.maxPrice && p.price > filters.maxPrice) matches = false;
    
    if (!matches) continue;
    
    if (filters.style) {
      for (var j = 0; j < p.tags.length; j++) {
        if (p.tags[j].indexOf(filters.style) >= 0) { score += 30; break; }
      }
    }
    
    if (filters.occasion) {
      for (var j = 0; j < p.tags.length; j++) {
        if (p.tags[j].indexOf(filters.occasion) >= 0) { score += 25; break; }
      }
    }
    
    if (filters.color) {
      for (var j = 0; j < p.colors.length; j++) {
        if (p.colors[j].toLowerCase().indexOf(filters.color) >= 0) { score += 20; break; }
      }
    }
    
    score += p.popularity / 10;
    
    var copy = {};
    for (var k in p) copy[k] = p[k];
    copy.score = score;
    results.push(copy);
  }
  
  results.sort(function(a, b) { return b.score - a.score; });
  return results;
}

function getPopularProducts(count) {
  count = count || 4;
  var sorted = CATALOG.slice().sort(function(a, b) { return b.popularity - a.popularity; });
  var results = [];
  for (var i = 0; i < sorted.length && results.length < count; i++) {
    if (sorted[i].inStock) results.push(sorted[i]);
  }
  return results;
}

function getNewProducts(count) {
  count = count || 4;
  var results = [];
  for (var i = 0; i < CATALOG.length && results.length < count; i++) {
    if (CATALOG[i].inStock && CATALOG[i].badge === "NUEVO") results.push(CATALOG[i]);
  }
  if (results.length < count) {
    var popular = getPopularProducts(count - results.length);
    for (var i = 0; i < popular.length; i++) results.push(popular[i]);
  }
  return results;
}

function getCategoryProducts(category, count) {
  count = count || 4;
  var results = [];
  for (var i = 0; i < CATALOG.length && results.length < count; i++) {
    if (CATALOG[i].inStock && CATALOG[i].category === category) results.push(CATALOG[i]);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECCIÓN DE INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function detectIntent(text) {
  var lower = text.toLowerCase();
  
  if (/^(hola|hey|buenas|buenos días|qué tal)/i.test(lower)) return "greeting";
  if (/(más vendidos|vendidos|populares|top|best)/i.test(lower)) return "bestsellers";
  if (/(novedades|nuevo|nuevos|recién|últimas)/i.test(lower)) return "new";
  if (/(buscar traje|traje|trajes|suit)/i.test(lower)) return "search_suits";
  if (/(ayuda|ayúdame|help|qué puedes|info)/i.test(lower)) return "help";
  if (/(gracias|genial|perfecto|vale|ok)/i.test(lower)) return "thanks";
  
  for (var key in FAQ) {
    var faq = FAQ[key];
    for (var i = 0; i < faq.keywords.length; i++) {
      if (lower.indexOf(faq.keywords[i]) >= 0) return { type: "faq", key: key };
    }
  }
  
  var filters = extractAllFilters(text);
  if (filters.category || filters.style || filters.occasion || filters.color || filters.maxPrice) {
    return { type: "search", filters: filters };
  }
  
  if (/(busco|quiero|necesito|buscando|dame|muéstrame|ver)/i.test(lower)) {
    return { type: "search", filters: filters };
  }
  
  return "unknown";
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESAMIENTO
// ═══════════════════════════════════════════════════════════════════════════════

function processMessage(text) {
  var response = { text: "", chips: [], products: null, showMore: false, totalResults: 0 };
  var intent = detectIntent(text);
  
  if (intent === "greeting") {
    response.text = "¡Hola! 👋 Soy tu asistente de moda. ¿En qué puedo ayudarte hoy?";
    response.chips = [
      { text: "🔥 Ver más vendidos" },
      { text: "✨ Novedades" },
      { text: "🎩 Buscar traje" },
      { text: "❓ Ayuda" }
    ];
  }
  else if (intent === "bestsellers") {
    var popular = getPopularProducts(4);
    response.text = "🔥 ¡Estos son nuestros más vendidos!";
    response.products = popular;
    chatState.lastResults = popular;
    response.chips = [{ text: "✨ Ver novedades" }, { text: "🔍 Filtrar por color" }];
  }
  else if (intent === "new") {
    var newProds = getNewProducts(4);
    response.text = "¡Estas son mis recomendaciones para ti! 👔";
    response.products = newProds;
    chatState.lastResults = CATALOG.filter(function(p) { return p.inStock; });
    response.totalResults = chatState.lastResults.length;
    response.showMore = chatState.lastResults.length > 4;
    response.chips = [
      { text: "Ver más (" + (chatState.lastResults.length - 4) + ")" },
      { text: "Filtrar por color" }
    ];
  }
  else if (intent === "search_suits") {
    var suits = getCategoryProducts("traje", 2);
    var blazers = getCategoryProducts("blazer", 2);
    var combined = suits.concat(blazers);
    response.text = "🎩 Aquí tienes nuestra selección de trajes y blazers:";
    response.products = combined;
    chatState.lastResults = combined;
    response.chips = [{ text: "Ver camisas" }, { text: "Ver pantalones" }];
  }
  else if (intent === "help") {
    response.text = "Puedo ayudarte a encontrar: 👕 Ropa por categoría, 🎨 Por color o estilo, 💰 Por presupuesto, 📦 Info de envíos.";
    response.chips = [
      { text: "🔥 Más vendidos" },
      { text: "📦 Envíos" },
      { text: "📏 Guía tallas" },
      { text: "💳 Pagos" }
    ];
  }
  else if (intent === "thanks") {
    response.text = "¡De nada! 😊 ¿Hay algo más en lo que pueda ayudarte?";
    response.chips = [{ text: "🔥 Ver más vendidos" }, { text: "✨ Novedades" }];
  }
  else if (intent && intent.type === "faq") {
    response.text = FAQ[intent.key].answer;
    response.chips = [{ text: "🔥 Ver productos" }, { text: "❓ Más ayuda" }];
  }
  else if (intent && intent.type === "search") {
    var results = searchProducts(intent.filters);
    chatState.lastResults = results;
    
    if (results.length === 0) {
      response.text = "No encontré productos con esos criterios. ¿Probamos otra búsqueda?";
      response.chips = [{ text: "🔥 Ver populares" }, { text: "✨ Ver todo" }];
    } else {
      response.text = results.length === 1 ? "🎯 ¡Encontré esto perfecto!" : "🔍 Encontré " + results.length + " opciones:";
      response.products = results.slice(0, 4);
      response.totalResults = results.length;
      response.showMore = results.length > 4;
      response.chips = results.length > 4 
        ? [{ text: "Ver más (" + (results.length - 4) + ")" }, { text: "Nueva búsqueda" }]
        : [{ text: "Nueva búsqueda" }];
    }
  }
  else {
    response.text = "No estoy seguro de entenderte. ¿Te ayudo con algo de esto?";
    response.chips = [{ text: "🔥 Ver más vendidos" }, { text: "✨ Novedades" }, { text: "❓ Ayuda" }];
  }
  
  return response;
}

function getWelcomeMessage() {
  return {
    text: "¡Hola! 👋 Soy tu asistente de moda. ¿En qué puedo ayudarte hoy?",
    chips: [
      { text: "🔥 Ver más vendidos" },
      { text: "✨ Novedades" },
      { text: "🎩 Buscar traje" },
      { text: "❓ Ayuda" }
    ],
    products: null
  };
}

// Export
window.ChatbotEngine = {
  processMessage: processMessage,
  getWelcomeMessage: getWelcomeMessage,
  getPopularProducts: getPopularProducts,
  getNewProducts: getNewProducts,
  searchProducts: searchProducts,
  getCategoryProducts: getCategoryProducts
};
