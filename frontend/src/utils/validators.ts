/**
 * Utilidades para validación de formularios
 */

// Regex para validaciones comunes
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  phone: /^\+?[0-9]{8,15}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  numbers: /^[0-9]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  rut: /^[0-9]{1,2}(?:\.[0-9]{3}){2}-[0-9kK]$/
};

/**
 * Valida si un campo es requerido
 */
export function required(value: any): boolean | string {
  if (value === null || value === undefined) return 'Este campo es requerido';
  if (typeof value === 'string' && value.trim() === '') return 'Este campo es requerido';
  if (Array.isArray(value) && value.length === 0) return 'Este campo es requerido';
  return true;
}

/**
 * Valida que un campo tenga una longitud mínima
 */
export function minLength(length: number) {
  return (value: string): boolean | string => {
    if (!value) return true; // Si no hay valor, no validar (usar required si es necesario)
    if (value.length < length) {
      return `Este campo debe tener al menos ${length} caracteres`;
    }
    return true;
  };
}

/**
 * Valida que un campo tenga una longitud máxima
 */
export function maxLength(length: number) {
  return (value: string): boolean | string => {
    if (!value) return true;
    if (value.length > length) {
      return `Este campo no puede tener más de ${length} caracteres`;
    }
    return true;
  };
}

/**
 * Valida que un campo sea un email válido
 */
export function email(value: string): boolean | string {
  if (!value) return true;
  if (!patterns.email.test(value)) {
    return 'El email no es válido';
  }
  return true;
}

/**
 * Valida que un campo sea un número
 */
export function isNumber(value: any): boolean | string {
  if (!value && value !== 0) return true;
  if (isNaN(Number(value))) {
    return 'Este campo debe ser un número';
  }
  return true;
}

/**
 * Valida un rango numérico
 */
export function numberRange(min: number, max: number) {
  return (value: number): boolean | string => {
    if (!value && value !== 0) return true;
    const num = Number(value);
    if (isNaN(num)) return true; // No validar si no es número
    if (num < min || num > max) {
      return `El valor debe estar entre ${min} y ${max}`;
    }
    return true;
  };
}

/**
 * Valida que un campo sea una contraseña segura
 * (mínimo 8 caracteres, al menos una letra mayúscula, una minúscula y un número)
 */
export function strongPassword(value: string): boolean | string {
  if (!value) return true;
  if (!patterns.password.test(value)) {
    return 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, una minúscula y un número';
  }
  return true;
}

/**
 * Valida que un campo sea un teléfono válido
 */
export function phone(value: string): boolean | string {
  if (!value) return true;
  if (!patterns.phone.test(value)) {
    return 'El número de teléfono no es válido';
  }
  return true;
}

/**
 * Valida que un campo sea una URL válida
 */
export function url(value: string): boolean | string {
  if (!value) return true;
  if (!patterns.url.test(value)) {
    return 'La URL no es válida';
  }
  return true;
}

/**
 * Valida que un campo coincida con otro
 */
export function matches(field: string, fieldName: string) {
  return (value: string, allValues: Record<string, any>): boolean | string => {
    if (!value) return true;
    if (value !== allValues[field]) {
      return `Este campo debe coincidir con ${fieldName}`;
    }
    return true;
  };
}

/**
 * Valida un RUT chileno
 */
export function validateRut(value: string): boolean | string {
  if (!value) return true;
  
  // Primero verificar el formato
  if (!patterns.rut.test(value)) {
    return 'El formato del RUT no es válido. Debe ser 12.345.678-9';
  }
  
  // Limpiar el RUT para validación (quitar puntos y guión)
  const rutClean = value.replace(/\./g, '').replace('-', '');
  const rutDigits = rutClean.slice(0, -1);
  const dv = rutClean.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = rutDigits.length - 1; i >= 0; i--) {
    sum += parseInt(rutDigits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDV = 11 - (sum % 11);
  let calculatedDV: string;
  
  if (expectedDV === 11) {
    calculatedDV = '0';
  } else if (expectedDV === 10) {
    calculatedDV = 'K';
  } else {
    calculatedDV = expectedDV.toString();
  }
  
  if (calculatedDV !== dv) {
    return 'El RUT no es válido';
  }
  
  return true;
}

/**
 * Compone varios validadores en uno solo
 */
export function composeValidators(...validators: Array<(value: any, allValues?: any) => boolean | string>) {
  return (value: any, allValues?: any): boolean | string => {
    for (const validator of validators) {
      const result = validator(value, allValues);
      if (result !== true) {
        return result;
      }
    }
    return true;
  };
} 