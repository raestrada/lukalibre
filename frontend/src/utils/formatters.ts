/**
 * Utilidades para formateo de valores comunes en la aplicación
 */

/**
 * Formatea un valor monetario según la localización y moneda
 * @param amount Monto a formatear
 * @param locale Localización (por defecto es-CL)
 * @param currency Moneda (por defecto CLP)
 * @returns String formateado
 */
export function formatCurrency(amount: number, locale = 'es-CL', currency = 'CLP'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Formatea una fecha según la localización
 * @param date Fecha a formatear (string ISO o Date)
 * @param locale Localización (por defecto es-CL)
 * @param options Opciones de formato
 * @returns String formateado
 */
export function formatDate(
  date: string | Date,
  locale = 'es-CL',
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Formatea un número según la localización
 * @param num Número a formatear
 * @param locale Localización (por defecto es-CL)
 * @param options Opciones de formato
 * @returns String formateado
 */
export function formatNumber(
  num: number,
  locale = 'es-CL',
  options: Intl.NumberFormatOptions = { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  }
): string {
  return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Formatea un porcentaje según la localización
 * @param value Valor a formatear (0.1 = 10%)
 * @param locale Localización (por defecto es-CL)
 * @returns String formateado
 */
export function formatPercent(value: number, locale = 'es-CL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Trunca un texto si excede la longitud máxima
 * @param text Texto a truncar
 * @param maxLength Longitud máxima
 * @param suffix Sufijo a añadir si se trunca
 * @returns Texto truncado
 */
export function truncateText(text: string, maxLength = 50, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Formatea un valor para representar su tamaño en bytes
 * @param bytes Cantidad de bytes
 * @param decimals Decimales a mostrar
 * @returns String formateado
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Capitaliza la primera letra de cada palabra en un texto
 * @param text Texto a capitalizar
 * @returns Texto capitalizado
 */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formatea un número de teléfono según el formato chileno
 * @param phone Número de teléfono
 * @returns Número formateado
 */
export function formatChileanPhone(phone: string): string {
  // Eliminar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Si comienza con 56, es formato internacional
  if (cleaned.startsWith('56') && cleaned.length >= 11) {
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
  }
  
  // Si comienza con 9, es celular nacional
  if (cleaned.startsWith('9') && cleaned.length >= 9) {
    return `+56 9 ${cleaned.substring(1, 5)} ${cleaned.substring(5)}`;
  }
  
  // Si tiene 8 dígitos, asumimos que es un número fijo sin código de área
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
  }
  
  // En otros casos devolver como está
  return phone;
} 