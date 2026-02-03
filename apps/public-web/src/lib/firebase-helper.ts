// Helper para validar y obtener Firestore de forma segura

import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

/**
 * Obtiene una instancia válida de Firestore con validación
 * Lanza un error claro si Firebase no está inicializado
 */
export function getValidFirestore(): admin.firestore.Firestore {
  try {
    const db = getFirestore();
    
    // Validar que db es un objeto Firestore válido
    // Verificar que tiene los métodos necesarios
    if (!db) {
      throw new Error('Firestore retornó null o undefined');
    }
    
    if (typeof db.collection !== 'function') {
      throw new Error('Firestore no tiene el método collection()');
    }
    
    if (typeof db.collectionGroup !== 'function') {
      throw new Error('Firestore no tiene el método collectionGroup()');
    }
    
    // Verificar que es una instancia de Firestore
    // Intentar crear una referencia de prueba (sin ejecutarla)
    try {
      // Esto debería funcionar sin lanzar error si db es válido
      const testRef = db.collection('_test');
      if (!testRef) {
        throw new Error('No se pudo crear referencia de prueba');
      }
    } catch (testError: any) {
      // Si el error es sobre Firebase no configurado, relanzarlo
      if (testError.message?.includes('Firebase Admin no está configurado')) {
        throw testError;
      }
      // Otros errores pueden ser normales (colección no existe, etc.)
    }
    
    return db;
  } catch (error: any) {
    console.error('❌ Error obteniendo Firestore válido:', error);
    throw new Error(
      `Firestore no está inicializado correctamente: ${error.message}\n` +
      'Asegúrate de que Firebase Admin esté configurado correctamente.'
    );
  }
}


