/**
 * Utilidades para Firestore - Limpieza de valores undefined
 * Firestore NO acepta valores undefined, solo null
 */
/**
 * Limpia recursivamente todos los valores undefined de un objeto
 * Los convierte a null o los elimina según el caso
 */
export declare function cleanFirestoreData<T>(data: any): T;
/**
 * Opción alternativa: usar ignoreUndefinedProperties
 * Pero es mejor limpiar los datos antes de guardarlos
 */
export declare function getFirestoreSettings(): {
    ignoreUndefinedProperties: boolean;
};
//# sourceMappingURL=firestore-utils.d.ts.map