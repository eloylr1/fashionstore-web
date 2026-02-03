/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Chatbot Engine
 * Motor de conversación sin IA externa - Basado en reglas y catálogo
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Estado del chat
const chatState = {
  messages: [],
  lastIntent: null,
  filters: {
    category: null,
    style: null,
    occasion: null,
    color: null,
    size: null,
    maxPrice: null
  },
  awaitingResponse: null,
  catalog: [],
  faq: {}
};

// Diccionario de sinónimos para categorías
const CATEGORY_SYNONYMS = {
  'camiseta': ['camiseta', 'camisetas', 't-shirt', 'tshirt', 'playera', 'remera'],
  'sudadera': ['sudadera', 'sudaderas', 'hoodie', 'hoodies', 'buzo', 'sweatshirt'],
  'pantalon': ['pantalón', 'pantalon', 'pantalones', 'jogger', 'joggers', 'jeans', 'vaquero', 'vaqueros', 'chino', 'chinos'],
  'camisa': ['camisa', 'camisas', 'shirt'],
  'blazer': ['blazer', 'blazers', 'americana', 'americanas', 'saco'],
  'abrigo': ['abrigo', 'abrigos', 'coat', 'parka', 'plumas'],
  'chaqueta': ['chaqueta', 'chaquetas', 'jacket', 'bomber', 'cazadora'],
  'polo': ['polo', 'polos'],
  'traje': ['traje', 'trajes', 'suit', 'terno', 'conjunto formal']
};

// Diccionario de estilos/ocasiones
const STYLE_KEYWORDS = {
  'elegante': ['elegante', 'elegantes', 'formal', 'formales', 'serio', 'clásico', 'clasico'],
  'casual': ['casual', 'informal', 'diario', 'día a día', 'normal'],
  'urbano': ['urbano', 'urbana', 'street', 'streetwear', 'callejero'],
  'deportivo': ['deportivo', 'deporte', 'gym', 'gimnasio', 'sport', 'fitness', 'correr'],
  'oversize': ['oversize', 'oversized', 'ancho', 'holgado', 'amplio'],
  'minimalista': ['minimalista', 'minimal', 'básico', 'basico', 'simple', 'sencillo']
};

const OCCASION_KEYWORDS = {
  'trabajo': ['trabajo', 'oficina', 'reunión', 'reunion', 'entrevista', 'profesional'],
  'evento': ['evento', 'fiesta', 'boda', 'cena', 'salir', 'noche', 'celebración'],
  'regalo': ['regalo', 'regalar', 'cumpleaños', 'navidad', 'aniversario'],
  'invierno': ['invierno', 'frío', 'frio', 'abrigar', 'abrigado'],
  'verano': ['verano', 'calor', 'fresco', 'ligero']
};

// Colores reconocidos
const COLOR_KEYWORDS = {
  'negro': ['negro', 'negra', 'black', 'oscuro'],
  'blanco': ['blanco', 'blanca', 'white'],
  'gris': ['gris', 'grey', 'gray'],
  'azul': ['azul', 'blue', 'marino', 'celeste'],
  'verde': ['verde', 'green'],
  'marrón': ['marrón', 'marron', 'brown', 'café', 'camel'],
  'beige': ['beige', 'crema', 'arena']
};

// Patrones de precio
const PRICE_PATTERNS = [
  { pattern: /menos de (\d+)/i, extract: (m) => parseInt(m[1]) },
  { pattern: /hasta (\d+)/i, extract: (m) => parseInt(m[1]) },
  { pattern: /máximo (\d+)/i, extract: (m) => parseInt(m[1]) },
  { pattern: /no más de (\d+)/i, extract: (m) => parseInt(m[1]) },
  { pattern: /(\d+)\s*€?\s*o menos/i, extract: (m) => parseInt(m[1]) },
  { pattern: /barato/i, extract: () => 30 },
  { pattern: /económico/i, extract: () => 40 },
  { pattern: /presupuesto bajo/i, extract: () => 35 }
];

// Saludos y respuestas básicas
const GREETING_KEYWORDS = ['hola', 'buenas', 'hey', 'buenos días', 'buenas tardes', 'qué tal', 'hi', 'hello'];
const THANKS_KEYWORDS = ['gracias', 'thanks', 'genial', 'perfecto', 'vale', 'ok', 'guay'];

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inicializa el chatbot con catálogo y FAQ
 */
export function initChatbot(catalog, faq) {
  chatState.catalog = catalog;
  chatState.faq = faq;
  
  // Mensaje de bienvenida
  addBotMessage(
    '¡Hola! 👋 Soy tu asistente de FashionMarket. ¿Qué buscas hoy?',
    ['Ver novedades', 'Buscar por categoría', 'Ofertas', 'Ayuda']
  );
}

/**
 * Procesa el mensaje del usuario
 */
export function processMessage(userMessage) {
  const text = userMessage.toLowerCase().trim();
  
  // Guardar mensaje del usuario
  addUserMessage(userMessage);
  
  // Si estábamos esperando una respuesta específica
  if (chatState.awaitingResponse) {
    return handleAwaitingResponse(text);
  }
  
  // Detectar intención
  const intent = detectIntent(text);
  
  switch (intent.type) {
    case 'greeting':
      return handleGreeting();
    case 'thanks':
      return handleThanks();
    case 'faq':
      return handleFAQ(intent.faqKey);
    case 'product_search':
      return handleProductSearch(intent.filters);
    case 'show_all':
      return handleShowAll();
    case 'help':
      return handleHelp();
    default:
      return handleUnknown(text);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓN DE INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════

function detectIntent(text) {
  // Verificar saludo
  if (GREETING_KEYWORDS.some(g => text.includes(g))) {
    return { type: 'greeting' };
  }
  
  // Verificar agradecimiento
  if (THANKS_KEYWORDS.some(t => text.includes(t))) {
    return { type: 'thanks' };
  }
  
  // Verificar FAQ
  for (const [key, faqItem] of Object.entries(chatState.faq)) {
    if (faqItem.keywords.some(kw => text.includes(kw))) {
      return { type: 'faq', faqKey: key };
    }
  }
  
  // Verificar ayuda general
  if (text.includes('ayuda') || text.includes('help') || text === '?') {
    return { type: 'help' };
  }
  
  // Verificar "ver todo"
  if (text.includes('ver todo') || text.includes('ver todos') || text.includes('catálogo') || text.includes('catalogo')) {
    return { type: 'show_all' };
  }
  
  // Extraer filtros de búsqueda de productos
  const filters = extractFilters(text);
  
  // Si hay algún filtro, es búsqueda de producto
  if (filters.category || filters.style || filters.occasion || filters.color || filters.maxPrice) {
    return { type: 'product_search', filters };
  }
  
  // Verificar palabras clave generales de compra
  if (text.includes('busco') || text.includes('necesito') || text.includes('quiero') || 
      text.includes('recomienda') || text.includes('novedades') || text.includes('nuevo')) {
    return { type: 'product_search', filters: {} };
  }
  
  return { type: 'unknown' };
}

function extractFilters(text) {
  const filters = { ...chatState.filters };
  
  // Extraer categoría
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some(s => text.includes(s))) {
      filters.category = category;
      break;
    }
  }
  
  // Extraer estilo
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      filters.style = style;
      break;
    }
  }
  
  // Extraer ocasión
  for (const [occasion, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      filters.occasion = occasion;
      break;
    }
  }
  
  // Extraer color
  for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      filters.color = color;
      break;
    }
  }
  
  // Extraer precio máximo
  for (const { pattern, extract } of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      filters.maxPrice = extract(match);
      break;
    }
  }
  
  // Extraer talla
  const sizeMatch = text.match(/\b(xs|s|m|l|xl|xxl|\d{2})\b/i);
  if (sizeMatch) {
    filters.size = sizeMatch[1].toUpperCase();
  }
  
  return filters;
}

// ═══════════════════════════════════════════════════════════════════════════
// MANEJADORES DE INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════

function handleGreeting() {
  addBotMessage(
    '¡Hola! 😊 ¿En qué puedo ayudarte hoy? Puedo recomendarte ropa, resolver dudas sobre envíos, pagos o tallas.',
    ['Ver novedades', 'Camisetas', 'Pantalones', 'Ayuda con mi pedido']
  );
}

function handleThanks() {
  addBotMessage(
    '¡De nada! 🙌 Si necesitas algo más, aquí estoy. ¡Que disfrutes tu compra!',
    ['Seguir comprando', 'Ver ofertas']
  );
}

function handleFAQ(faqKey) {
  const faq = chatState.faq[faqKey];
  if (faq) {
    let message = faq.answer;
    if (faq.link) {
      message += ` <a href="${faq.link}" class="chatbot-link">Más info →</a>`;
    }
    addBotMessage(message, ['Tengo otra duda', 'Buscar productos']);
  }
}

function handleProductSearch(newFilters) {
  // Actualizar filtros
  chatState.filters = { ...chatState.filters, ...newFilters };
  chatState.lastIntent = 'product_search';
  
  // Buscar productos
  const results = searchProducts(chatState.filters);
  
  if (results.length === 0) {
    // No hay resultados exactos
    chatState.filters = {}; // Reset filters
    const popular = getPopularProducts(3);
    addBotMessage(
      'No encontré coincidencias exactas, pero estos son nuestros más vendidos:',
      null,
      popular
    );
    return;
  }
  
  // Si tenemos resultados pero faltan datos importantes, preguntar
  if (!chatState.filters.category && !chatState.filters.style && results.length > 4) {
    chatState.awaitingResponse = 'category';
    addBotMessage(
      '¿Qué tipo de prenda buscas?',
      ['Camisetas', 'Sudaderas', 'Pantalones', 'Camisas', 'Chaquetas']
    );
    return;
  }
  
  // Mostrar resultados (máximo 4)
  const topResults = results.slice(0, 4);
  const message = topResults.length === 1 
    ? '¡Tengo justo lo que buscas!'
    : `Encontré ${results.length} opciones. Estas son las mejores:`;
  
  addBotMessage(message, null, topResults);
  
  // Reset filtros para siguiente búsqueda
  chatState.filters = {};
}

function handleAwaitingResponse(text) {
  const awaiting = chatState.awaitingResponse;
  chatState.awaitingResponse = null;
  
  if (awaiting === 'category') {
    const filters = extractFilters(text);
    return handleProductSearch(filters);
  }
  
  // Si no entendemos, procesar como mensaje normal
  return processMessage(text);
}

function handleShowAll() {
  addBotMessage(
    'Puedes ver todo nuestro catálogo aquí: <a href="/tienda" class="chatbot-link">Ver tienda completa →</a>',
    ['Filtrar por categoría', 'Ver ofertas']
  );
}

function handleHelp() {
  addBotMessage(
    'Puedo ayudarte con:\n• 🛒 Buscar productos (ej: "sudadera negra")\n• 📦 Info de envíos y devoluciones\n• 💳 Formas de pago\n• 📏 Guía de tallas\n\n¿Qué necesitas?',
    ['Buscar ropa', 'Envíos', 'Devoluciones', 'Tallas']
  );
}

function handleUnknown(text) {
  // Intentar mostrar productos populares
  const popular = getPopularProducts(3);
  addBotMessage(
    'No estoy seguro de entenderte. ¿Buscas alguna de estas prendas populares? También puedes preguntarme por envíos, tallas o pagos.',
    ['Ver categorías', 'Envíos', 'Contacto'],
    popular
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BÚSQUEDA Y RANKING DE PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

function searchProducts(filters) {
  let results = chatState.catalog.filter(p => p.inStock);
  
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
  
  // Filtrar por precio
  if (filters.maxPrice) {
    results = results.filter(p => p.price <= filters.maxPrice);
  }
  
  // Filtrar por talla
  if (filters.size) {
    results = results.filter(p => 
      p.sizes.some(s => s.toUpperCase() === filters.size)
    );
  }
  
  // Rankear por coincidencia de tags + popularidad
  results = results.map(p => {
    let score = p.popularity;
    
    // Bonus por coincidencia de estilo
    if (filters.style && p.tags.includes(filters.style)) {
      score += 30;
    }
    
    // Bonus por coincidencia de ocasión
    if (filters.occasion && p.tags.includes(filters.occasion)) {
      score += 25;
    }
    
    return { ...p, score };
  });
  
  // Ordenar por score
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

function getPopularProducts(count = 3) {
  return [...chatState.catalog]
    .filter(p => p.inStock)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERIZADO DE MENSAJES
// ═══════════════════════════════════════════════════════════════════════════

function addUserMessage(text) {
  chatState.messages.push({ type: 'user', text });
  renderMessage('user', text);
}

function addBotMessage(text, chips = null, products = null) {
  chatState.messages.push({ type: 'bot', text, chips, products });
  renderMessage('bot', text, chips, products);
}

function renderMessage(type, text, chips = null, products = null) {
  const container = document.getElementById('chatbot-messages');
  if (!container) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `chatbot-message chatbot-message-${type}`;
  
  // Contenido del mensaje
  const bubble = document.createElement('div');
  bubble.className = 'chatbot-bubble';
  bubble.innerHTML = text.replace(/\n/g, '<br>');
  msgDiv.appendChild(bubble);
  
  // Productos si hay
  if (products && products.length > 0) {
    const productsDiv = document.createElement('div');
    productsDiv.className = 'chatbot-products';
    
    products.forEach(p => {
      productsDiv.innerHTML += `
        <div class="chatbot-product-card">
          <div class="chatbot-product-info">
            <span class="chatbot-product-name">${p.name}</span>
            <span class="chatbot-product-price">${p.price.toFixed(2)}€</span>
          </div>
          <a href="${p.url}" class="chatbot-product-btn">Ver</a>
        </div>
      `;
    });
    
    msgDiv.appendChild(productsDiv);
  }
  
  // Chips si hay
  if (chips && chips.length > 0) {
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'chatbot-chips';
    
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.className = 'chatbot-chip';
      btn.textContent = chip;
      btn.onclick = () => {
        document.getElementById('chatbot-input').value = chip;
        window.sendChatMessage();
      };
      chipsDiv.appendChild(btn);
    });
    
    msgDiv.appendChild(chipsDiv);
  }
  
  container.appendChild(msgDiv);
  
  // Scroll al final
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR PARA USO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.chatbotEngine = {
    init: initChatbot,
    process: processMessage,
    getState: () => chatState
  };
}
