/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Size Recommender Logic
 * Algoritmo para recomendar talla basado en altura y peso
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type SizeResult = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

interface UserMeasurements {
  height: number; // cm
  weight: number; // kg
}

interface RecommendationResult {
  size: SizeResult;
  confidence: 'alta' | 'media' | 'baja';
  message: string;
}

/**
 * Calcula el IMC (Índice de Masa Corporal)
 */
const calculateBMI = (height: number, weight: number): number => {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

/**
 * Recomienda una talla basándose en altura y peso
 * 
 * Algoritmo:
 * - Usa una combinación de altura, peso e IMC
 * - Altura determina la base de talla
 * - Peso/IMC ajusta hacia arriba o abajo
 * 
 * @param measurements - Altura en cm y peso en kg
 * @returns Objeto con talla recomendada, nivel de confianza y mensaje
 */
export function recommendSize(measurements: UserMeasurements): RecommendationResult {
  const { height, weight } = measurements;
  
  // Validaciones
  if (height < 140 || height > 220) {
    return {
      size: 'M',
      confidence: 'baja',
      message: 'La altura está fuera del rango típico. Te recomendamos consultar nuestra guía de tallas.',
    };
  }
  
  if (weight < 40 || weight > 150) {
    return {
      size: 'M',
      confidence: 'baja',
      message: 'El peso está fuera del rango típico. Te recomendamos consultar nuestra guía de tallas.',
    };
  }

  const bmi = calculateBMI(height, weight);
  
  // Determinar talla base por altura
  let baseSize: number;
  if (height < 160) {
    baseSize = 0; // XS
  } else if (height < 168) {
    baseSize = 1; // S
  } else if (height < 176) {
    baseSize = 2; // M
  } else if (height < 184) {
    baseSize = 3; // L
  } else if (height < 192) {
    baseSize = 4; // XL
  } else {
    baseSize = 5; // XXL
  }

  // Ajustar por peso/IMC
  let adjustment = 0;
  
  // IMC bajo (<18.5): tender a talla menor
  if (bmi < 18.5) {
    adjustment = -1;
  }
  // IMC normal-bajo (18.5-22): sin ajuste o ligero menos
  else if (bmi >= 18.5 && bmi < 22) {
    adjustment = 0;
  }
  // IMC normal-alto (22-25): sin ajuste o ligero más
  else if (bmi >= 22 && bmi < 25) {
    // Ajuste por peso absoluto para personas más pesadas pero normales
    if (weight > 85) {
      adjustment = 1;
    }
  }
  // IMC sobrepeso (25-30): tender a talla mayor
  else if (bmi >= 25 && bmi < 30) {
    adjustment = 1;
  }
  // IMC alto (>30): tender a dos tallas mayor
  else {
    adjustment = 2;
  }

  // Ajustes adicionales por casos específicos
  // Persona alta y delgada
  if (height > 185 && weight < 75) {
    adjustment = Math.min(adjustment, 0);
  }
  // Persona baja y pesada
  if (height < 165 && weight > 80) {
    adjustment = Math.max(adjustment, 1);
  }

  // Calcular talla final
  let finalSize = Math.max(0, Math.min(5, baseSize + adjustment));
  
  const sizes: SizeResult[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const size = sizes[finalSize];

  // Determinar confianza
  let confidence: 'alta' | 'media' | 'baja';
  let message: string;

  // Alta confianza si los valores están en rangos típicos y no hay ajustes extremos
  if (Math.abs(adjustment) <= 1 && bmi >= 18.5 && bmi <= 27) {
    confidence = 'alta';
    message = `Según tus medidas (${height}cm, ${weight}kg), esta talla debería ajustarte perfectamente.`;
  } else if (Math.abs(adjustment) <= 2) {
    confidence = 'media';
    message = `Basándonos en tus medidas, esta talla debería quedar bien. Si prefieres un ajuste más holgado, considera una talla más.`;
  } else {
    confidence = 'baja';
    message = `Esta es nuestra mejor estimación. Te recomendamos revisar la guía de tallas para mayor precisión.`;
  }

  return { size, confidence, message };
}

/**
 * Valida que las medidas sean razonables
 */
export function validateMeasurements(height: number, weight: number): { valid: boolean; error?: string } {
  if (isNaN(height) || isNaN(weight)) {
    return { valid: false, error: 'Por favor, introduce valores numéricos válidos.' };
  }
  
  if (height <= 0 || weight <= 0) {
    return { valid: false, error: 'Los valores deben ser mayores que cero.' };
  }
  
  if (height < 100 || height > 250) {
    return { valid: false, error: 'Por favor, introduce una altura válida (entre 100 y 250 cm).' };
  }
  
  if (weight < 30 || weight > 200) {
    return { valid: false, error: 'Por favor, introduce un peso válido (entre 30 y 200 kg).' };
  }
  
  return { valid: true };
}
