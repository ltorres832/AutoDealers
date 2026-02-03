import { NextRequest } from 'next/server';
import { getAuth } from '@autodealers/core';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';

const auth = getAuth();

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'dealer' | 'seller';
  tenantId?: string;
  dealerId?: string;
}

/**
 * Verifica autenticación y retorna usuario
 * Soporta tanto ID Tokens de Firebase como SessionIds
 */
// Cache simple en memoria para evitar verificaciones repetidas
const authCache = new Map<string, { user: AuthUser; expires: number }>();
const CACHE_TTL = 60000; // 1 minuto

// Limpiar caché expirado (solo cuando se accede, no con setInterval)
function cleanExpiredCache() {
  const now = Date.now();
  for (const [token, cached] of authCache.entries()) {
    if (cached.expires <= now) {
      authCache.delete(token);
    }
  }
  // Limitar tamaño del caché a 100 entradas
  if (authCache.size > 100) {
    const entries = Array.from(authCache.entries());
    entries.sort((a, b) => a[1].expires - b[1].expires);
    const toDelete = entries.slice(0, authCache.size - 100);
    toDelete.forEach(([token]) => authCache.delete(token));
  }
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Obtener token de cookies o headers
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('authToken')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const token = headerToken || cookieToken;

    console.log('🔐 verifyAuth - Token sources:', {
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.warn('⚠️ verifyAuth - No token found');
      return null;
    }

    // Limpiar caché expirado
    cleanExpiredCache();

    // Verificar caché
    const cached = authCache.get(token);
    if (cached && cached.expires > Date.now()) {
      return cached.user;
    }

    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();

    // Intentar decodificar el token como base64 primero (puede ser un sessionId codificado)
    let sessionId: string | null = null;
    if (token.length > 64 && token.length < 200) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        // Si el resultado decodificado parece un sessionId (hex de 64 chars)
        if (/^[a-f0-9]{64}$/i.test(decoded)) {
          sessionId = decoded;
          console.log('✅ verifyAuth - Token decodificado como sessionId desde base64');
        }
      } catch (e) {
        // No es base64 válido, continuar
      }
    }
    
    // Si no se decodificó, verificar si es directamente un sessionId (hex de 64 chars)
    if (!sessionId && /^[a-f0-9]{64}$/i.test(token)) {
      sessionId = token;
      console.log('✅ verifyAuth - Token es un sessionId directo');
    }
    
    // Si es un sessionId, verificar desde Firestore primero
    if (sessionId) {
      try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        
        if (!sessionDoc.exists) {
          console.warn('⚠️ verifyAuth - Session no encontrada:', sessionId.substring(0, 16) + '...');
          // Si es un sessionId pero no existe, retornar null inmediatamente
          // No continuar con Firebase ID token para evitar confusión
          return null;
        } else {
          const sessionData = sessionDoc.data();
          
          // Verificar expiración
          if (sessionData?.expiresAt) {
            const expiresAt = sessionData.expiresAt.toDate();
            if (expiresAt < new Date()) {
              console.warn('⚠️ verifyAuth - Session expirada');
              await sessionDoc.ref.delete();
              // Continuar con verificación de Firebase ID token como fallback
            } else {
              // Actualizar última actividad
              await sessionDoc.ref.update({
                lastActivity: admin.firestore.FieldValue.serverTimestamp(),
              });
              
              // Buscar usuario en admin_users primero
              const adminDoc = await db.collection('admin_users').doc(sessionData.userId).get();
              
              if (adminDoc.exists) {
                const adminData = adminDoc.data();
                
                if (adminData?.isActive === false) {
                  console.warn(`⚠️ Admin ${sessionData.userId} está inactivo`);
                  return null;
                }
                
                const user: AuthUser = {
                  userId: sessionData.userId,
                  email: sessionData.email || adminData?.email || '',
                  role: 'admin',
                };
                
                console.log('✅ verifyAuth - Admin autenticado por sessionId');
                
                // Guardar en caché
                authCache.set(token, { user, expires: Date.now() + CACHE_TTL });
                
                return user;
              }
              
              // Si no es admin, buscar en users
              const userDoc = await db.collection('users').doc(sessionData.userId).get();
              
              if (userDoc.exists) {
                const userData = userDoc.data();
                
                if (userData?.status === 'suspended' || userData?.status === 'cancelled') {
                  console.warn(`⚠️ Usuario ${sessionData.userId} está ${userData.status}`);
                  return null;
                }
                
                const user: AuthUser = {
                  userId: sessionData.userId,
                  email: sessionData.email || userData?.email || '',
                  role: (sessionData.role || userData?.role || 'seller') as 'admin' | 'dealer' | 'seller',
                  tenantId: userData?.tenantId,
                  dealerId: userData?.dealerId,
                };
                
                console.log('✅ verifyAuth - Usuario autenticado por sessionId');
                
                // Guardar en caché
                authCache.set(token, { user, expires: Date.now() + CACHE_TTL });
                
                return user;
              }
            }
          }
        }
      } catch (sessionError: any) {
        console.error('❌ verifyAuth - Error verificando sessionId:', sessionError.message);
        // Continuar con verificación de Firebase ID token como fallback
      }
    }

    // Si no es sessionId o falló la verificación de sessionId, intentar como Firebase ID Token
    // Un Firebase ID Token típicamente tiene más de 800 caracteres
    if (token.length > 800) {
      console.log('🔐 verifyAuth - Intentando verificar como Firebase ID Token (length:', token.length, ')');
      console.log('🔐 verifyAuth - Token preview:', token.substring(0, 100) + '...');
      try {
        const decodedToken = await auth.verifyIdToken(token);
        console.log('✅ verifyAuth - Firebase ID Token válido, UID:', decodedToken.uid);
        console.log('✅ verifyAuth - Email del token:', decodedToken.email);
        console.log('✅ verifyAuth - Custom claims:', decodedToken.customClaims);
      
      // Primero verificar si es admin en admin_users
      const adminDoc = await db.collection('admin_users').doc(decodedToken.uid).get();
      
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        
        // Verificar si el admin está activo
        if (adminData?.isActive === false) {
          console.warn(`⚠️ Admin ${decodedToken.uid} está inactivo`);
          return null;
        }
        
        const user: AuthUser = {
          userId: decodedToken.uid,
          email: decodedToken.email || adminData?.email || '',
          role: 'admin',
          // Los admins no tienen tenantId ni dealerId
        };
        
        console.log('✅ verifyAuth - Admin authenticated (admin_users):', {
          userId: user.userId,
          email: user.email,
          role: user.role,
        });
        
        // Guardar en caché
        authCache.set(token, { user, expires: Date.now() + CACHE_TTL });
        
        return user;
      }
      
      // Si no está en admin_users, buscar en users (puede ser admin con role: 'admin')
      console.log('🔍 verifyAuth - Buscando usuario en users collection, UID:', decodedToken.uid);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) {
        console.warn(`⚠️ Usuario ${decodedToken.uid} no encontrado en users ni admin_users`);
        console.warn(`⚠️ Email del token: ${decodedToken.email}`);
        // Intentar buscar por email como último recurso
        if (decodedToken.email) {
          const usersByEmail = await db.collection('users').where('email', '==', decodedToken.email).limit(1).get();
          if (!usersByEmail.empty) {
            const foundUser = usersByEmail.docs[0];
            console.log(`✅ Usuario encontrado por email: ${foundUser.id}`);
            const userData = foundUser.data();
            if (userData?.role === 'admin') {
              const user: AuthUser = {
                userId: foundUser.id,
                email: decodedToken.email || userData?.email || '',
                role: 'admin',
              };
              console.log('✅ verifyAuth - Admin authenticated (users by email):', {
                userId: user.userId,
                email: user.email,
                role: user.role,
              });
              authCache.set(token, { user, expires: Date.now() + CACHE_TTL });
              return user;
            }
          }
        }
        return null;
      }

      const userData = userDoc.data();
      
      // Verificar si el usuario está activo
      if (userData?.status === 'suspended' || userData?.status === 'cancelled') {
        console.warn(`⚠️ Usuario ${decodedToken.uid} está ${userData.status}`);
        return null;
      }
      
      // Si el usuario tiene role: 'admin', tratarlo como admin
      if (userData?.role === 'admin') {
        const user: AuthUser = {
          userId: decodedToken.uid,
          email: decodedToken.email || userData?.email || '',
          role: 'admin',
          // Los admins no tienen tenantId ni dealerId
        };
        
        console.log('✅ verifyAuth - Admin authenticated (users):', {
          userId: user.userId,
          email: user.email,
          role: user.role,
        });
        
        // Guardar en caché
        authCache.set(token, { user, expires: Date.now() + CACHE_TTL });
        
        return user;
      }
      
      // Si no es admin, es dealer o seller
      const user: AuthUser = {
        userId: decodedToken.uid,
        email: decodedToken.email || userData?.email || '',
        role: userData?.role || 'seller',
        tenantId: userData?.tenantId,
        dealerId: userData?.dealerId,
      };

        console.log('✅ verifyAuth - User authenticated:', {
          userId: user.userId,
          email: user.email,
          role: user.role,
        });

        // Guardar en caché
        authCache.set(token, { user, expires: Date.now() + CACHE_TTL });
        
        return user;
      } catch (firebaseError: any) {
        console.error('❌ verifyAuth - Error verificando Firebase ID Token:', {
          code: firebaseError.code,
          message: firebaseError.message,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 50) + '...',
        });
        
        // Si el token está expirado, informar claramente
        if (firebaseError.code === 'auth/id-token-expired') {
          console.warn('⚠️ verifyAuth - Token expirado. El usuario necesita hacer login nuevamente.');
        }
        
        // Si el token es inválido, informar claramente
        if (firebaseError.code === 'auth/argument-error' || firebaseError.code === 'auth/invalid-id-token') {
          console.warn('⚠️ verifyAuth - Token inválido. Posiblemente corrupto o malformado.');
        }
        
        // Si falla como Firebase Token, no intentar como SessionId (el token es muy largo)
        return null;
      }
    } else {
      // Si el token no es largo, intentar como SessionId directamente
      try {
        const sessionDoc = await db.collection('sessions').doc(token).get();

        if (!sessionDoc.exists) {
          return null;
        }

        const sessionData = sessionDoc.data();

        // Verificar que la sesión no haya expirado
        const now = Date.now();
        const expiresAt = sessionData?.expiresAt?.toMillis();

        if (!expiresAt || expiresAt < now) {
          // No esperar la eliminación para no bloquear
          db.collection('sessions').doc(token).delete().catch(() => {});
          return null;
        }

        // Actualizar lastActivity (simplificado, sin verificación de tiempo)
        db.collection('sessions').doc(token).update({
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});

        // CRÍTICO: Obtener el rol del documento de usuario en Firestore
        // en lugar de confiar solo en la sesión, para asegurar que siempre
        // tenga el rol más actualizado
        let userRole = sessionData?.role || 'admin';
        let userTenantId = sessionData?.tenantId;
        let userDealerId = sessionData?.dealerId;
        
        try {
          // Primero intentar obtener de admin_users si el rol es admin
          if (sessionData?.role === 'admin') {
            const adminDoc = await db.collection('admin_users').doc(sessionData?.userId).get();
            if (adminDoc.exists) {
              const adminData = adminDoc.data();
              
              // Verificar si el admin está activo
              if (adminData?.isActive === false) {
                console.warn(`⚠️ Admin ${sessionData?.userId} está inactivo`);
                return null;
              }
              
              userRole = 'admin';
              // Los admins no tienen tenantId ni dealerId
              userTenantId = undefined;
              userDealerId = undefined;
            } else {
              console.warn(`⚠️ Admin ${sessionData?.userId} no encontrado en admin_users`);
              return null;
            }
          } else {
            // Para otros roles, buscar en users
            const userDoc = await db.collection('users').doc(sessionData?.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              // Usar el rol del documento de usuario si existe, de lo contrario usar el de la sesión
              userRole = userData?.role || userRole;
              userTenantId = userData?.tenantId || userTenantId;
              userDealerId = userData?.dealerId || userDealerId;
              
              // Si el rol en la sesión es diferente al del documento, actualizar la sesión
              if (sessionData?.role !== userRole) {
                console.log(`⚠️ Rol desincronizado. Sesión: ${sessionData?.role}, Usuario: ${userRole}. Actualizando sesión...`);
                db.collection('sessions').doc(token).update({
                  role: userRole,
                  tenantId: userTenantId,
                  dealerId: userDealerId,
                }).catch(() => {});
              }
            }
          }
        } catch (userDocError: any) {
          console.warn('⚠️ Error obteniendo documento de usuario, usando rol de sesión:', userDocError.message);
        }

        const user: AuthUser = {
          userId: sessionData?.userId || '',
          email: sessionData?.email || '',
          role: userRole,
          tenantId: userTenantId,
          dealerId: userDealerId,
        };

        console.log('✅ verifyAuth - Session authenticated:', {
          userId: user.userId,
          email: user.email,
          role: user.role,
        });

        // Guardar en caché
        authCache.set(token, { user, expires: Date.now() + CACHE_TTL });

        return user;
      } catch (sessionError: any) {
        // Si falla la sesión, retornar null silenciosamente
        console.warn('⚠️ verifyAuth - Session verification failed:', sessionError.message);
        return null;
      }
    }
  } catch (error: any) {
    console.error('❌ Error en verifyAuth:', error.message, error.stack);
    return null;
  }
}
