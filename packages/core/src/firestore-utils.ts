/**
 * Utilidades para Firestore - Limpieza de valores undefined
 * Firestore NO acepta valores undefined, solo null
 */

/**
 * Limpia recursivamente todos los valores undefined de un objeto
 * Los convierte a null o los elimina según el caso
 */
export function cleanFirestoreData<T>(data: any): T {
  if (data === undefined) {
    return null as T;
  }

  if (data === null) {
    return null as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => cleanFirestoreData(item)) as T;
  }

  if (typeof data === 'object' && data !== null) {
    const cleaned: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        if (value !== undefined) {
          cleaned[key] = cleanFirestoreData(value);
        }
        // Si es undefined, simplemente no lo agregamos al objeto
      }
    }
    return cleaned as T;
  }

  return data as T;
}

/**
 * Opción alternativa: usar ignoreUndefinedProperties
 * Pero es mejor limpiar los datos antes de guardarlos
 */
export function getFirestoreSettings() {
  return {
    ignoreUndefinedProperties: true,
  };
}


