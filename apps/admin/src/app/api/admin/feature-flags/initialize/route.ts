export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

// Features por defecto según el documento maestro
const DEFAULT_FEATURES = {
  // Purchase Intent y Verificación
  purchaseIntent: {
    enabled: true,
    visible: {
      admin: true,
      dealer: false,
      seller: false,
    },
    description: 'Sistema de Purchase Intent y verificación de ventas',
  },
  
  // KPIs y Métricas
  kpis: {
    enabled: true,
    visible: {
      admin: true,
      dealer: false,
      seller: false,
    },
    description: 'Dashboard de KPIs y métricas',
  },
  
  // Sistema Antifraude
  antifraud: {
    enabled: true,
    visible: {
      admin: true,
      dealer: false,
      seller: false,
    },
    description: 'Sistema de detección de fraude',
  },
  
  // Certificados
  certificates: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Certificados de compra con QR',
  },
  
  // Roadside Assistance
  roadside: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Roadside Assistance (Connect)',
  },
  
  // Partners - Seguros
  partnersInsurance: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Integración con seguros',
  },
  
  // Partners - Bancos
  partnersBanks: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Integración con bancos',
  },
  
  // Earnings (solo admin)
  earnings: {
    enabled: true,
    visible: {
      admin: true,
      dealer: false,
      seller: false,
    },
    description: 'Sistema de earnings (solo admin)',
  },
  
  // Archivo del Cliente
  customerFiles: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Archivo del cliente y documentos finales',
  },
  
  // Contratos y Firmas Digitales
  contracts: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Gestión de contratos y firmas digitales',
  },
  
  // Plantillas de Contratos
  contractTemplates: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Plantillas de contratos',
  },
  
  // F&I Module
  fiModule: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Módulo de Financiamiento e Seguro',
  },
  
  // CRM Avanzado
  advancedCRM: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'CRM con funcionalidades avanzadas',
  },
  
  // IA
  ai: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Funcionalidades de IA',
  },
  
  // Mensajería Omnicanal
  messaging: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Mensajería omnicanal',
  },
  
  // Inventario
  inventory: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Gestión de inventario',
  },
  
  // Ventas
  sales: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Gestión de ventas',
  },
  
  // Citas
  appointments: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Sistema de citas',
  },
  
  // Reportes
  reports: {
    enabled: true,
    visible: {
      admin: true,
      dealer: true,
      seller: true,
    },
    description: 'Reportes y análisis',
  },
  
  // Configuración del Sistema
  systemSettings: {
    enabled: true,
    visible: {
      admin: true,
      dealer: false,
      seller: false,
    },
    description: 'Configuración del sistema (solo admin)',
  },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar si ya existen features
    const featuresDoc = await db.collection('system_settings').doc('feature_flags').get();
    
    if (featuresDoc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Las features ya están inicializadas',
        features: featuresDoc.data(),
      });
    }

    // Crear features por defecto
    await db.collection('system_settings').doc('feature_flags').set({
      features: DEFAULT_FEATURES,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Features inicializadas exitosamente',
      features: DEFAULT_FEATURES,
    });
  } catch (error: any) {
    console.error('Error initializing features:', error);
    return NextResponse.json(
      { error: error.message || 'Error al inicializar features' },
      { status: 500 }
    );
  }
}


