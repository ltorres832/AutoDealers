// Sistema de Configuración de Branding en Documentos

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface DocumentBrandingConfig {
  tenantId: string;
  userId?: string; // Opcional, para configuraciones por usuario
  
  // Configuración de logos
  showPlatformLogo: boolean;
  showDealerLogo: boolean;
  showSellerLogo: boolean;
  
  // Configuración de nombres
  showPlatformName: boolean;
  showDealerName: boolean;
  showSellerName: boolean;
  
  // Orden de visualización (1 = primero, 2 = segundo, etc.)
  logoOrder: {
    platform: number;
    dealer: number;
    seller: number;
  };
  
  nameOrder: {
    platform: number;
    dealer: number;
    seller: number;
  };
  
  // URLs de logos personalizados
  platformLogoUrl?: string;
  dealerLogoUrl?: string;
  sellerLogoUrl?: string;
  
  // Nombres personalizados
  platformName?: string;
  dealerName?: string;
  sellerName?: string;
  
  // Configuración por tipo de documento
  documentTypes: {
    certificate?: DocumentTypeConfig;
    contract?: DocumentTypeConfig;
    invoice?: DocumentTypeConfig;
    receipt?: DocumentTypeConfig;
    [key: string]: DocumentTypeConfig | undefined;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTypeConfig {
  showPlatformLogo: boolean;
  showDealerLogo: boolean;
  showSellerLogo: boolean;
  showPlatformName: boolean;
  showDealerName: boolean;
  showSellerName: boolean;
  logoOrder?: {
    platform: number;
    dealer: number;
    seller: number;
  };
  nameOrder?: {
    platform: number;
    dealer: number;
    seller: number;
  };
}

/**
 * Obtiene la configuración de branding para un tenant/usuario
 */
export async function getDocumentBrandingConfig(
  tenantId: string,
  userId?: string
): Promise<DocumentBrandingConfig | null> {
  // Primero intentar obtener configuración específica del usuario
  if (userId) {
    const userConfigDoc = await getDb().collection('document_branding')
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!userConfigDoc.empty) {
      const data = userConfigDoc.docs[0].data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as DocumentBrandingConfig;
    }
  }
  
  // Si no hay configuración de usuario, obtener la del tenant
  const tenantConfigDoc = await getDb().collection('document_branding')
    .where('tenantId', '==', tenantId)
    .where('userId', '==', null)
    .limit(1)
    .get();
  
  if (!tenantConfigDoc.empty) {
    const data = tenantConfigDoc.docs[0].data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as DocumentBrandingConfig;
  }
  
  return null;
}

/**
 * Crea o actualiza la configuración de branding
 */
export async function setDocumentBrandingConfig(
  config: Partial<DocumentBrandingConfig> & { tenantId: string }
): Promise<DocumentBrandingConfig> {
  const { tenantId, userId } = config;
  
  // Buscar configuración existente
  let query = getDb().collection('document_branding')
    .where('tenantId', '==', tenantId);
  
  if (userId) {
    query = query.where('userId', '==', userId);
  } else {
    query = query.where('userId', '==', null);
  }
  
  const existing = await query.limit(1).get();
  
  const configData: any = {
    tenantId,
    userId: userId || null,
    showPlatformLogo: config.showPlatformLogo !== undefined ? config.showPlatformLogo : true,
    showDealerLogo: config.showDealerLogo !== undefined ? config.showDealerLogo : true,
    showSellerLogo: config.showSellerLogo !== undefined ? config.showSellerLogo : false,
    showPlatformName: config.showPlatformName !== undefined ? config.showPlatformName : true,
    showDealerName: config.showDealerName !== undefined ? config.showDealerName : true,
    showSellerName: config.showSellerName !== undefined ? config.showSellerName : false,
    logoOrder: config.logoOrder || {
      platform: 1,
      dealer: 2,
      seller: 3,
    },
    nameOrder: config.nameOrder || {
      platform: 1,
      dealer: 2,
      seller: 3,
    },
    platformLogoUrl: config.platformLogoUrl,
    dealerLogoUrl: config.dealerLogoUrl,
    sellerLogoUrl: config.sellerLogoUrl,
    platformName: config.platformName,
    dealerName: config.dealerName,
    sellerName: config.sellerName,
    documentTypes: config.documentTypes || {},
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  if (existing.empty) {
    configData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const docRef = getDb().collection('document_branding').doc();
    await docRef.set(configData);
    return {
      ...configData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DocumentBrandingConfig;
  } else {
    const docRef = existing.docs[0].ref;
    await docRef.update(configData);
    const updated = await docRef.get();
    return {
      ...updated.data(),
      createdAt: updated.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
    } as DocumentBrandingConfig;
  }
}

/**
 * Obtiene la configuración efectiva para un tipo de documento específico
 */
export async function getDocumentTypeBranding(
  tenantId: string,
  documentType: string,
  userId?: string
): Promise<DocumentTypeConfig> {
  const config = await getDocumentBrandingConfig(tenantId, userId);
  
  if (!config) {
    // Configuración por defecto
    return {
      showPlatformLogo: true,
      showDealerLogo: true,
      showSellerLogo: false,
      showPlatformName: true,
      showDealerName: true,
      showSellerName: false,
    };
  }
  
  // Si hay configuración específica para este tipo de documento, usarla
  const documentTypeConfig = config.documentTypes[documentType];
  
  if (documentTypeConfig) {
    return {
      showPlatformLogo: documentTypeConfig.showPlatformLogo !== undefined 
        ? documentTypeConfig.showPlatformLogo 
        : config.showPlatformLogo,
      showDealerLogo: documentTypeConfig.showDealerLogo !== undefined 
        ? documentTypeConfig.showDealerLogo 
        : config.showDealerLogo,
      showSellerLogo: documentTypeConfig.showSellerLogo !== undefined 
        ? documentTypeConfig.showSellerLogo 
        : config.showSellerLogo,
      showPlatformName: documentTypeConfig.showPlatformName !== undefined 
        ? documentTypeConfig.showPlatformName 
        : config.showPlatformName,
      showDealerName: documentTypeConfig.showDealerName !== undefined 
        ? documentTypeConfig.showDealerName 
        : config.showDealerName,
      showSellerName: documentTypeConfig.showSellerName !== undefined 
        ? documentTypeConfig.showSellerName 
        : config.showSellerName,
      logoOrder: documentTypeConfig.logoOrder || config.logoOrder,
      nameOrder: documentTypeConfig.nameOrder || config.nameOrder,
    };
  }
  
  // Usar configuración general
  return {
    showPlatformLogo: config.showPlatformLogo,
    showDealerLogo: config.showDealerLogo,
    showSellerLogo: config.showSellerLogo,
    showPlatformName: config.showPlatformName,
    showDealerName: config.showDealerName,
    showSellerName: config.showSellerName,
    logoOrder: config.logoOrder,
    nameOrder: config.nameOrder,
  };
}

/**
 * Obtiene los logos y nombres ordenados según la configuración
 */
export async function getOrderedBrandingElements(
  tenantId: string,
  documentType: string,
  userId?: string
): Promise<{
  logos: Array<{ type: 'platform' | 'dealer' | 'seller'; url?: string; name?: string }>;
  names: Array<{ type: 'platform' | 'dealer' | 'seller'; text: string }>;
}> {
  const config = await getDocumentBrandingConfig(tenantId, userId);
  const typeConfig = await getDocumentTypeBranding(tenantId, documentType, userId);
  
  if (!config) {
    return { logos: [], names: [] };
  }
  
  // Obtener información del tenant y usuario
  const tenantDoc = await getDb().collection('tenants').doc(tenantId).get();
  const tenantData = tenantDoc.exists ? tenantDoc.data() : null;
  
  let userData: any = null;
  if (userId) {
    const userDoc = await getDb().collection('users').doc(userId).get();
    userData = userDoc.exists ? userDoc.data() : null;
  }
  
  // Construir array de logos
  const logos: Array<{ type: 'platform' | 'dealer' | 'seller'; url?: string; name?: string }> = [];
  
  if (typeConfig.showPlatformLogo) {
    logos.push({
      type: 'platform',
      url: config.platformLogoUrl,
      name: config.platformName || 'AutoDealers',
    });
  }
  
  if (typeConfig.showDealerLogo && tenantData) {
    logos.push({
      type: 'dealer',
      url: config.dealerLogoUrl || tenantData.logoUrl,
      name: config.dealerName || tenantData.name || tenantData.companyName,
    });
  }
  
  if (typeConfig.showSellerLogo && userData) {
    logos.push({
      type: 'seller',
      url: config.sellerLogoUrl,
      name: config.sellerName || userData.name,
    });
  }
  
  // Ordenar logos según logoOrder
  const logoOrder = typeConfig.logoOrder || config.logoOrder;
  logos.sort((a, b) => {
    const orderA = logoOrder[a.type] || 999;
    const orderB = logoOrder[b.type] || 999;
    return orderA - orderB;
  });
  
  // Construir array de nombres
  const names: Array<{ type: 'platform' | 'dealer' | 'seller'; text: string }> = [];
  
  if (typeConfig.showPlatformName) {
    names.push({
      type: 'platform',
      text: config.platformName || 'AutoDealers',
    });
  }
  
  if (typeConfig.showDealerName && tenantData) {
    names.push({
      type: 'dealer',
      text: config.dealerName || tenantData.name || tenantData.companyName || '',
    });
  }
  
  if (typeConfig.showSellerName && userData) {
    names.push({
      type: 'seller',
      text: config.sellerName || userData.name || '',
    });
  }
  
  // Ordenar nombres según nameOrder
  const nameOrder = typeConfig.nameOrder || config.nameOrder;
  names.sort((a, b) => {
    const orderA = nameOrder[a.type] || 999;
    const orderB = nameOrder[b.type] || 999;
    return orderA - orderB;
  });
  
  return { logos, names };
}


