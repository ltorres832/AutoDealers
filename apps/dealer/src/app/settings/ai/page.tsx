'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AIConfig {
  enabled: boolean;
  
  // Respuestas automáticas
  autoResponses: {
    enabled: boolean;
    channels: string[]; // whatsapp, facebook, instagram, email, sms
    responseDelay: number; // minutos
    requireApproval: boolean; // requiere aprobación antes de enviar
  };
  
  // Generación de contenido para redes sociales
  socialContent: {
    enabled: boolean;
    generateText: boolean;
    generateHashtags: boolean;
    suggestImages: boolean;
    optimizeForPlatform: boolean; // optimizar para cada plataforma
  };
  
  // Clasificación de leads
  leadClassification: {
    enabled: boolean;
    autoClassify: boolean; // clasificar automáticamente
    assignPriority: boolean; // asignar prioridad automáticamente
    detectSentiment: boolean; // detectar sentimiento
  };
  
  // Sugerencias de respuestas
  responseSuggestions: {
    enabled: boolean;
    showSuggestions: boolean; // mostrar sugerencias mientras escribes
    autoSuggest: boolean; // sugerir automáticamente
  };
  
  // Seguimientos automáticos
  autoFollowups: {
    enabled: boolean;
    followupDelay: number; // días
    maxFollowups: number; // máximo de seguimientos
    channels: string[]; // canales para seguimientos
  };
  
  // Generación de emails
  emailGeneration: {
    enabled: boolean;
    generateSubject: boolean;
    generateBody: boolean;
    personalizeContent: boolean; // personalizar contenido
  };
  
  // Análisis y reportes
  analytics: {
    enabled: boolean;
    generateReports: boolean;
    analyzePerformance: boolean;
    suggestImprovements: boolean;
  };
  
  // Predicción y análisis predictivo
  predictive: {
    enabled: boolean;
    predictLeadConversion: boolean; // Predice probabilidad de cierre
    predictTimeToSale: boolean; // Predice tiempo hasta venta
    predictInventoryTurnover: boolean; // Predice rotación de inventario
    predictVehicleDemand: boolean; // Predice demanda por tipo de vehículo
  };
  
  // Optimización de campañas
  campaignOptimization: {
    enabled: boolean;
    optimizeBudget: boolean; // Optimiza presupuestos automáticamente
    suggestAudiences: boolean; // Sugiere audiencias objetivo
    optimizePostingSchedule: boolean; // Optimiza horarios de publicación
    abTesting: boolean; // A/B testing automático
  };
  
  // Personalización avanzada
  advancedPersonalization: {
    enabled: boolean;
    personalizeMessages: boolean; // Personaliza mensajes por perfil
    recommendVehicles: boolean; // Recomienda vehículos basado en historial
    personalizePromotions: boolean; // Personaliza promociones por cliente
    adaptiveContent: boolean; // Contenido adaptativo
  };
  
  // Análisis de competencia
  competitorAnalysis: {
    enabled: boolean;
    analyzeMarketPricing: boolean; // Analiza precios de mercado
    compareCompetitors: boolean; // Compara con competidores
    identifyOpportunities: boolean; // Identifica oportunidades de mercado
    analyzeTrends: boolean; // Analiza tendencias del sector
  };
  
  // Automatización avanzada
  advancedAutomation: {
    enabled: boolean;
    autoEscalateLeads: boolean; // Escala leads críticos automáticamente
    autoAssignLeads: boolean; // Asigna leads a vendedores automáticamente
    autoScheduleFollowups: boolean; // Programa seguimientos automáticamente
    detectPurchaseIntent: boolean; // Detecta intención de compra
  };
  
  // Análisis de sentimiento avanzado
  advancedSentiment: {
    enabled: boolean;
    detectEmotions: boolean; // Detecta emociones en conversaciones
    dissatisfactionAlerts: boolean; // Alertas tempranas de insatisfacción
    analyzeTone: boolean; // Analiza tono y lenguaje
    predictAbandonment: boolean; // Predice abandono de leads
  };
  
  // Optimización de inventario
  inventoryOptimization: {
    enabled: boolean;
    suggestPurchases: boolean; // Sugiere qué vehículos comprar
    analyzeProfitability: boolean; // Analiza rentabilidad por vehículo
    optimizeMix: boolean; // Optimiza mix de inventario
    predictSeasonalDemand: boolean; // Predice demanda estacional
  };
  
  // Análisis de rendimiento
  performanceAnalysis: {
    enabled: boolean;
    analyzeSellerPerformance: boolean; // Analiza rendimiento por vendedor
    identifyBestPractices: boolean; // Identifica mejores prácticas
    suggestImprovements: boolean; // Sugiere mejoras continuas
    autoBenchmarking: boolean; // Benchmarking automático
  };
  
  // Chatbot avanzado
  advancedChatbot: {
    enabled: boolean;
    available247: boolean; // Disponible 24/7
    realTimeInventory: boolean; // Integración con inventario en tiempo real
    multiLanguage: boolean; // Multi-idioma automático
    conversationalAI: boolean; // IA conversacional avanzada
  };
  
  // Análisis de ROI
  roiAnalysis: {
    enabled: boolean;
    calculateCampaignROI: boolean; // Calcula ROI por campaña
    analyzeCostPerLead: boolean; // Analiza costo por lead
    optimizeMarketingInvestment: boolean; // Optimiza inversión en marketing
    predictROI: boolean; // Predice retorno de inversión
  };
  
  // Personalización
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  language: string; // es, en, etc.
  customInstructions: string; // instrucciones personalizadas para la IA
  
  // Mensajes y Plantillas
  messageTemplates: {
    enabled: boolean;
    templates: Array<{
      id: string;
      name: string;
      category: 'greeting' | 'followup' | 'closing' | 'custom';
      content: string;
      variables?: string[]; // variables como {nombre}, {vehiculo}, etc.
    }>;
    autoResponses: Array<{
      id: string;
      trigger: string; // palabra clave o condición
      message: string;
      enabled: boolean;
    }>;
  };
  
  // Perfil y Referencias para la IA (Expandido para automatización 24/7)
  profileQuestions: {
    // Información Básica del Negocio
    businessName?: string;
    businessType?: string; // concesionario, particular, etc.
    location?: string;
    address?: string; // dirección completa
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string; // teléfono principal
    website?: string; // sitio web
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      tiktok?: string;
    };
    yearsInBusiness?: number;
    numberOfEmployees?: number;
    annualSalesVolume?: number; // volumen anual de ventas
    
    // Especialidades y Enfoque
    specialties?: string; // marcas que manejan, tipos de vehículos, etc.
    preferredMakes?: string[]; // marcas preferidas
    preferredModels?: string[]; // modelos preferidos
    vehicleTypes?: string[]; // tipos: sedán, SUV, pickup, etc.
    priceRange?: {
      min?: number;
      max?: number;
    };
    targetMarket?: string; // mercado objetivo
    
    // Cliente Típico y Perfil
    typicalCustomer?: string; // descripción del cliente típico
    customerDemographics?: {
      ageRange?: { min: number; max: number };
      incomeLevel?: string;
      location?: string;
      preferences?: string;
    };
    customerPainPoints?: string; // problemas comunes de los clientes
    customerGoals?: string; // objetivos comunes de los clientes
    
    // Ventaja Competitiva
    uniqueSellingPoints?: string; // qué los hace diferentes
    competitiveAdvantages?: string[]; // ventajas competitivas
    awards?: string; // premios o reconocimientos
    certifications?: string; // certificaciones
    
    // Estrategia de Precios y Negociación
    pricingStrategy?: string; // cómo manejan precios
    negotiationStyle?: 'aggressive' | 'moderate' | 'conservative';
    discountPolicy?: string; // política de descuentos
    minimumProfitMargin?: number; // margen mínimo de ganancia (%)
    priceFlexibility?: 'high' | 'medium' | 'low';
    seasonalPricing?: string; // variaciones de precio por temporada
    
    // Métodos de Pago y Financiamiento
    paymentOptions?: string; // métodos de pago aceptados
    financingOptions?: string; // opciones de financiamiento
    financingPartners?: string[]; // bancos o instituciones financieras aliadas
    downPaymentRequirements?: string; // requisitos de enganche
    creditScoreRequirements?: string; // requisitos de crédito
    financingApprovalTime?: string; // tiempo de aprobación
    
    // Garantías y Servicios
    warrantyInfo?: string; // información sobre garantías
    warrantyTypes?: string[]; // tipos de garantía ofrecidos
    serviceCenter?: boolean; // tienen centro de servicio
    serviceHours?: string; // horarios de servicio
    maintenancePackages?: string; // paquetes de mantenimiento
    roadsideAssistance?: boolean; // asistencia en carretera
    
    // Políticas de Negocio
    tradeInPolicy?: string; // política de cambio
    tradeInEvaluation?: string; // cómo evalúan cambios
    returnPolicy?: string; // política de devolución
    cancellationPolicy?: string; // política de cancelación
    deliveryOptions?: string; // opciones de entrega
    deliveryRadius?: number; // radio de entrega (km)
    deliveryFee?: string; // costo de entrega
    testDrivePolicy?: string; // política de prueba de manejo
    
    // Horarios y Disponibilidad
    businessHours?: string; // horarios de atención
    businessDays?: string[]; // días de la semana abiertos
    emergencyContact?: string; // contacto de emergencia
    afterHoursPolicy?: string; // política fuera de horario
    
    // Preferencias de Comunicación
    contactPreferences?: string; // cómo prefieren ser contactados
    preferredChannels?: string[]; // canales preferidos: whatsapp, email, phone, etc.
    responseTimeGoals?: {
      whatsapp?: number; // minutos
      email?: number; // horas
      phone?: number; // minutos
      sms?: number; // minutos
    };
    communicationStyle?: {
      whatsapp?: 'formal' | 'casual' | 'friendly';
      email?: 'formal' | 'casual' | 'friendly';
      phone?: 'formal' | 'casual' | 'friendly';
      sms?: 'formal' | 'casual' | 'friendly';
    };
    
    // Estilo de Respuesta y Personalidad
    responseStyle?: string; // cómo prefieren responder (formal, casual, etc.)
    brandVoice?: string; // voz de marca
    toneGuidelines?: string; // guías de tono
    languagePreferences?: string[]; // idiomas que manejan
    emojiUsage?: 'never' | 'rarely' | 'sometimes' | 'often';
    
    // Preguntas Frecuentes y Respuestas
    commonQuestions?: string; // preguntas frecuentes que reciben
    faqAnswers?: Array<{
      question: string;
      answer: string;
    }>;
    objectionHandling?: string; // cómo manejan objeciones comunes
    
    // Límites y Políticas Estrictas
    dealBreakers?: string; // cosas que nunca harían
    strictPolicies?: string[]; // políticas estrictas
    legalRequirements?: string; // requisitos legales
    complianceRules?: string; // reglas de cumplimiento
    
    // Historias de Éxito y Social Proof
    successStories?: string; // historias de éxito o casos destacados
    testimonials?: string[]; // testimonios de clientes
    caseStudies?: string; // casos de estudio
    customerCount?: number; // número de clientes atendidos
    repeatCustomerRate?: number; // porcentaje de clientes repetidos
    
    // Procesos y Workflows
    salesProcess?: string; // proceso de venta paso a paso
    leadQualification?: string; // cómo califican leads
    appointmentProcess?: string; // proceso de citas
    closingProcess?: string; // proceso de cierre
    followUpProcess?: string; // proceso de seguimiento
    postSaleProcess?: string; // proceso post-venta
    
    // Reglas de Automatización
    autoResponseRules?: {
      whenToRespond?: string; // cuándo responder automáticamente
      whenToEscalate?: string; // cuándo escalar a humano
      whenToSchedule?: string; // cuándo programar citas automáticamente
      whenToSendFollowUp?: string; // cuándo enviar seguimientos
    };
    escalationRules?: {
      urgentKeywords?: string[]; // palabras clave urgentes
      highValueThreshold?: number; // umbral de valor alto
      timeBasedEscalation?: string; // escalamiento basado en tiempo
    };
    
    // Inventario y Stock
    inventoryManagement?: {
      preferredStock?: string[]; // stock preferido
      reorderPoints?: string; // puntos de reorden
      seasonalInventory?: string; // inventario estacional
      fastMovingItems?: string[]; // productos de movimiento rápido
      slowMovingItems?: string[]; // productos de movimiento lento
    };
    
    // Servicios Adicionales
    additionalServices?: string[]; // servicios adicionales
    servicePricing?: string; // precios de servicios
    servicePackages?: string; // paquetes de servicios
    
    // Competencia Local
    localCompetitors?: string[]; // competidores locales
    competitivePositioning?: string; // posicionamiento competitivo
    marketShare?: string; // participación de mercado
    
    // Objetivos y KPIs
    businessGoals?: string; // objetivos del negocio
    monthlyTargets?: {
      sales?: number;
      leads?: number;
      revenue?: number;
    };
    kpis?: string[]; // KPIs importantes
    
    // Información del Equipo
    teamStructure?: string; // estructura del equipo
    roles?: Array<{
      role: string;
      responsibilities: string;
      contactInfo?: string;
    }>;
    sellerSpecializations?: string; // especializaciones de vendedores
    
    // Reglas de Asignación
    leadAssignmentRules?: {
      bySource?: Record<string, string>; // asignación por fuente
      byType?: Record<string, string>; // asignación por tipo
      byValue?: Record<string, string>; // asignación por valor
      roundRobin?: boolean; // distribución rotativa
    };
    
    // Preferencias de Campañas y Marketing
    marketingPreferences?: {
      preferredChannels?: string[];
      budgetAllocation?: Record<string, number>; // % por canal
      campaignTypes?: string[]; // tipos de campañas preferidas
      contentStyle?: string; // estilo de contenido
    };
    
    // Información Legal y Regulatoria
    licenses?: string[]; // licencias y permisos
    insurance?: string; // información de seguros
    legalEntity?: string; // entidad legal
    taxId?: string; // ID fiscal
    
    // Integraciones y Sistemas
    crmSystem?: string; // sistema CRM usado
    inventorySystem?: string; // sistema de inventario
    accountingSystem?: string; // sistema contable
    otherIntegrations?: string[]; // otras integraciones
    
    // Notas y Contexto Adicional
    additionalContext?: string; // contexto adicional importante
    specialInstructions?: string; // instrucciones especiales para la IA
    businessPhilosophy?: string; // filosofía del negocio
    vision?: string; // visión del negocio
    mission?: string; // misión del negocio
  };
}

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    autoResponses: {
      enabled: false,
      channels: [],
      responseDelay: 5,
      requireApproval: true,
    },
    socialContent: {
      enabled: false,
      generateText: false,
      generateHashtags: false,
      suggestImages: false,
      optimizeForPlatform: false,
    },
    leadClassification: {
      enabled: false,
      autoClassify: false,
      assignPriority: false,
      detectSentiment: false,
    },
    responseSuggestions: {
      enabled: false,
      showSuggestions: false,
      autoSuggest: false,
    },
    autoFollowups: {
      enabled: false,
      followupDelay: 3,
      maxFollowups: 3,
      channels: [],
    },
    emailGeneration: {
      enabled: false,
      generateSubject: false,
      generateBody: false,
      personalizeContent: false,
    },
    analytics: {
      enabled: false,
      generateReports: false,
      analyzePerformance: false,
      suggestImprovements: false,
    },
    predictive: {
      enabled: false,
      predictLeadConversion: false,
      predictTimeToSale: false,
      predictInventoryTurnover: false,
      predictVehicleDemand: false,
    },
    campaignOptimization: {
      enabled: false,
      optimizeBudget: false,
      suggestAudiences: false,
      optimizePostingSchedule: false,
      abTesting: false,
    },
    advancedPersonalization: {
      enabled: false,
      personalizeMessages: false,
      recommendVehicles: false,
      personalizePromotions: false,
      adaptiveContent: false,
    },
    competitorAnalysis: {
      enabled: false,
      analyzeMarketPricing: false,
      compareCompetitors: false,
      identifyOpportunities: false,
      analyzeTrends: false,
    },
    advancedAutomation: {
      enabled: false,
      autoEscalateLeads: false,
      autoAssignLeads: false,
      autoScheduleFollowups: false,
      detectPurchaseIntent: false,
    },
    advancedSentiment: {
      enabled: false,
      detectEmotions: false,
      dissatisfactionAlerts: false,
      analyzeTone: false,
      predictAbandonment: false,
    },
    inventoryOptimization: {
      enabled: false,
      suggestPurchases: false,
      analyzeProfitability: false,
      optimizeMix: false,
      predictSeasonalDemand: false,
    },
    performanceAnalysis: {
      enabled: false,
      analyzeSellerPerformance: false,
      identifyBestPractices: false,
      suggestImprovements: false,
      autoBenchmarking: false,
    },
    advancedChatbot: {
      enabled: false,
      available247: false,
      realTimeInventory: false,
      multiLanguage: false,
      conversationalAI: false,
    },
    roiAnalysis: {
      enabled: false,
      calculateCampaignROI: false,
      analyzeCostPerLead: false,
      optimizeMarketingInvestment: false,
      predictROI: false,
    },
    tone: 'professional',
    language: 'es',
    customInstructions: '',
    messageTemplates: {
      enabled: false,
      templates: [],
      autoResponses: [],
    },
    profileQuestions: {
      socialMedia: {},
      responseTimeGoals: {},
      autoResponseRules: {},
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/ai', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          // Asegurar que todos los campos nuevos existen con valores por defecto
          const configData: AIConfig = {
            ...data.config,
            predictive: data.config.predictive || {
              enabled: false,
              predictLeadConversion: false,
              predictTimeToSale: false,
              predictInventoryTurnover: false,
              predictVehicleDemand: false,
            },
            campaignOptimization: data.config.campaignOptimization || {
              enabled: false,
              optimizeBudget: false,
              suggestAudiences: false,
              optimizePostingSchedule: false,
              abTesting: false,
            },
            advancedPersonalization: data.config.advancedPersonalization || {
              enabled: false,
              personalizeMessages: false,
              recommendVehicles: false,
              personalizePromotions: false,
              adaptiveContent: false,
            },
            competitorAnalysis: data.config.competitorAnalysis || {
              enabled: false,
              analyzeMarketPricing: false,
              compareCompetitors: false,
              identifyOpportunities: false,
              analyzeTrends: false,
            },
            advancedAutomation: data.config.advancedAutomation || {
              enabled: false,
              autoEscalateLeads: false,
              autoAssignLeads: false,
              autoScheduleFollowups: false,
              detectPurchaseIntent: false,
            },
            advancedSentiment: data.config.advancedSentiment || {
              enabled: false,
              detectEmotions: false,
              dissatisfactionAlerts: false,
              analyzeTone: false,
              predictAbandonment: false,
            },
            inventoryOptimization: data.config.inventoryOptimization || {
              enabled: false,
              suggestPurchases: false,
              analyzeProfitability: false,
              optimizeMix: false,
              predictSeasonalDemand: false,
            },
            performanceAnalysis: data.config.performanceAnalysis || {
              enabled: false,
              analyzeSellerPerformance: false,
              identifyBestPractices: false,
              suggestImprovements: false,
              autoBenchmarking: false,
            },
            advancedChatbot: data.config.advancedChatbot || {
              enabled: false,
              available247: false,
              realTimeInventory: false,
              multiLanguage: false,
              conversationalAI: false,
            },
            roiAnalysis: data.config.roiAnalysis || {
              enabled: false,
              calculateCampaignROI: false,
              analyzeCostPerLead: false,
              optimizeMarketingInvestment: false,
              predictROI: false,
            },
            messageTemplates: data.config.messageTemplates || {
              enabled: false,
              templates: [],
              autoResponses: [],
            },
            profileQuestions: data.config.profileQuestions || {
              socialMedia: {},
              responseTimeGoals: {},
              autoResponseRules: {},
            },
          };
          setConfig(configData);
        }
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/settings/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración de IA guardada exitosamente' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Error al guardar configuración' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(channel: string, category: 'autoResponses' | 'autoFollowups') {
    setConfig(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        channels: prev[category].channels.includes(channel)
          ? prev[category].channels.filter(c => c !== channel)
          : [...prev[category].channels, channel],
      },
    }));
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/settings" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Volver a Configuración
        </Link>
        <h1 className="text-2xl font-bold mb-2">Configuración de IA</h1>
        <p className="text-gray-600">
          Configura qué quiere que la IA haga por ti. Activa o desactiva cada funcionalidad según tus necesidades.
        </p>
      </div>

      {/* Habilitar/Deshabilitar IA */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Activar Inteligencia Artificial</h2>
            <p className="text-sm text-gray-600">
              Activa la IA para que te ayude con todas las tareas configuradas abajo
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Respuestas Automáticas */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">💬 Respuestas Automáticas</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoResponses.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                autoResponses: { ...prev.autoResponses, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA responderá automáticamente a mensajes entrantes según tus configuraciones
        </p>
        
        {config.autoResponses.enabled && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            <div>
              <label className="block text-sm font-medium mb-2">Canales</label>
              <div className="flex flex-wrap gap-2">
                {['whatsapp', 'facebook', 'instagram', 'email', 'sms'].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoResponses.channels.includes(channel)}
                      onChange={() => toggleChannel(channel, 'autoResponses')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm capitalize">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Retraso antes de responder (minutos)
              </label>
              <input
                type="number"
                value={config.autoResponses.responseDelay}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  autoResponses: { ...prev.autoResponses, responseDelay: parseInt(e.target.value) || 5 },
                }))}
                className="w-full px-3 py-2 border rounded"
                min="0"
                max="60"
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoResponses.requireApproval}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  autoResponses: { ...prev.autoResponses, requireApproval: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Requerir aprobación antes de enviar</span>
            </label>
          </div>
        )}
      </div>

      {/* Generación de Contenido para Redes Sociales */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Generación de Contenido para Redes Sociales</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.socialContent.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                socialContent: { ...prev.socialContent, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA generará textos, hashtags y sugerencias de imágenes para tus posts
        </p>
        
        {config.socialContent.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.socialContent.generateText}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  socialContent: { ...prev.socialContent, generateText: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Generar texto automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.socialContent.generateHashtags}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  socialContent: { ...prev.socialContent, generateHashtags: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Generar hashtags automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.socialContent.suggestImages}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  socialContent: { ...prev.socialContent, suggestImages: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Sugerir imágenes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.socialContent.optimizeForPlatform}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  socialContent: { ...prev.socialContent, optimizeForPlatform: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Optimizar contenido para cada plataforma</span>
            </label>
          </div>
        )}
      </div>

      {/* Clasificación de Leads */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Clasificación de Leads</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.leadClassification.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                leadClassification: { ...prev.leadClassification, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA analizará y clasificará automáticamente tus leads
        </p>
        
        {config.leadClassification.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.leadClassification.autoClassify}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  leadClassification: { ...prev.leadClassification, autoClassify: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Clasificar automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.leadClassification.assignPriority}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  leadClassification: { ...prev.leadClassification, assignPriority: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Asignar prioridad automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.leadClassification.detectSentiment}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  leadClassification: { ...prev.leadClassification, detectSentiment: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Detectar sentimiento</span>
            </label>
          </div>
        )}
      </div>

      {/* Sugerencias de Respuestas */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">💡 Sugerencias de Respuestas</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.responseSuggestions.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                responseSuggestions: { ...prev.responseSuggestions, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA te sugerirá respuestas mientras escribes o automáticamente
        </p>
        
        {config.responseSuggestions.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.responseSuggestions.showSuggestions}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  responseSuggestions: { ...prev.responseSuggestions, showSuggestions: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Mostrar sugerencias mientras escribes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.responseSuggestions.autoSuggest}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  responseSuggestions: { ...prev.responseSuggestions, autoSuggest: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Sugerir automáticamente</span>
            </label>
          </div>
        )}
      </div>

      {/* Seguimientos Automáticos */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Seguimientos Automáticos</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoFollowups.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                autoFollowups: { ...prev.autoFollowups, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA enviará seguimientos automáticos a tus leads y clientes
        </p>
        
        {config.autoFollowups.enabled && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            <div>
              <label className="block text-sm font-medium mb-2">Retraso entre seguimientos (días)</label>
              <input
                type="number"
                value={config.autoFollowups.followupDelay}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  autoFollowups: { ...prev.autoFollowups, followupDelay: parseInt(e.target.value) || 3 },
                }))}
                className="w-full px-3 py-2 border rounded"
                min="1"
                max="30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Máximo de seguimientos</label>
              <input
                type="number"
                value={config.autoFollowups.maxFollowups}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  autoFollowups: { ...prev.autoFollowups, maxFollowups: parseInt(e.target.value) || 3 },
                }))}
                className="w-full px-3 py-2 border rounded"
                min="1"
                max="10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Canales</label>
              <div className="flex flex-wrap gap-2">
                {['whatsapp', 'email', 'sms'].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoFollowups.channels.includes(channel)}
                      onChange={() => toggleChannel(channel, 'autoFollowups')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm capitalize">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generación de Emails */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Generación de Emails</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.emailGeneration.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                emailGeneration: { ...prev.emailGeneration, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA generará asuntos y cuerpos de email automáticamente
        </p>
        
        {config.emailGeneration.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.emailGeneration.generateSubject}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  emailGeneration: { ...prev.emailGeneration, generateSubject: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Generar asunto automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.emailGeneration.generateBody}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  emailGeneration: { ...prev.emailGeneration, generateBody: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Generar cuerpo del email automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.emailGeneration.personalizeContent}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  emailGeneration: { ...prev.emailGeneration, personalizeContent: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Personalizar contenido según el cliente</span>
            </label>
          </div>
        )}
      </div>

      {/* Análisis y Reportes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Análisis y Reportes</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.analytics.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                analytics: { ...prev.analytics, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA analizará tu rendimiento y generará reportes automáticamente
        </p>
        
        {config.analytics.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.analytics.generateReports}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  analytics: { ...prev.analytics, generateReports: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Generar reportes automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.analytics.analyzePerformance}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  analytics: { ...prev.analytics, analyzePerformance: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analizar rendimiento</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.analytics.suggestImprovements}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  analytics: { ...prev.analytics, suggestImprovements: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Sugerir mejoras</span>
            </label>
          </div>
        )}
      </div>

      {/* Perfil y Referencias para la IA - EXPANDIDO PARA AUTOMATIZACIÓN 24/7 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Perfil Completo del Negocio para IA</h2>
          <p className="text-sm text-gray-600 mb-2">
            Completa esta información detallada para que la IA trabaje de manera autónoma 24/7, tomando decisiones inteligentes y ahorrándote tiempo en todos los aspectos de tu negocio.
          </p>
          <p className="text-xs text-blue-600 font-medium">
            💡 Mientras más información proporciones, más eficiente y autónoma será la IA trabajando por ti
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Negocio</label>
              <input
                type="text"
                value={config.profileQuestions?.businessName || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), businessName: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: AutoMax Concesionario"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Negocio</label>
              <select
                value={config.profileQuestions?.businessType || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), businessType: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Seleccionar...</option>
                <option value="concesionario">Concesionario</option>
                <option value="particular">Particular</option>
                <option value="distribuidor">Distribuidor</option>
                <option value="agencia">Agencia</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Ubicación</label>
              <input
                type="text"
                value={config.profileQuestions?.location || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), location: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Ciudad, Estado, País"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Años en el Negocio</label>
              <input
                type="number"
                value={config.profileQuestions?.yearsInBusiness || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), yearsInBusiness: parseInt(e.target.value) || undefined },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: 5"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Especialidades</label>
            <textarea
              value={config.profileQuestions?.specialties || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), specialties: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: Especializados en vehículos Toyota y Honda. También manejamos vehículos de lujo como BMW y Mercedes-Benz."
            />
            <p className="text-xs text-gray-500 mt-1">Menciona las marcas, tipos de vehículos o servicios en los que te especializas</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Cliente Típico</label>
            <textarea
              value={config.profileQuestions?.typicalCustomer || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), typicalCustomer: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: Familias jóvenes buscando su primer vehículo, profesionales que necesitan un auto confiable para trabajo, personas mayores que buscan comodidad y seguridad."
            />
            <p className="text-xs text-gray-500 mt-1">Describe el tipo de cliente que sueles atender</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Puntos Únicos de Venta</label>
            <textarea
              value={config.profileQuestions?.uniqueSellingPoints || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), uniqueSellingPoints: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: Ofrecemos garantía extendida en todos nuestros vehículos, servicio de entrega a domicilio, y financiamiento flexible con aprobación rápida."
            />
            <p className="text-xs text-gray-500 mt-1">¿Qué te hace diferente de la competencia?</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Estrategia de Precios</label>
            <textarea
              value={config.profileQuestions?.pricingStrategy || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), pricingStrategy: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: Precios competitivos y negociables. Siempre estamos dispuestos a trabajar con el presupuesto del cliente. Ofrecemos descuentos por pago de contado."
            />
            <p className="text-xs text-gray-500 mt-1">¿Cómo manejas los precios? ¿Son negociables? ¿Ofreces descuentos?</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Métodos de Pago Aceptados</label>
              <input
                type="text"
                value={config.profileQuestions?.paymentOptions || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), paymentOptions: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Efectivo, tarjeta de crédito/débito, transferencia bancaria"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Opciones de Financiamiento</label>
              <input
                type="text"
                value={config.profileQuestions?.financingOptions || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), financingOptions: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Financiamiento propio, bancos aliados, aprobación en 24 horas"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Información de Garantías</label>
              <input
                type="text"
                value={config.profileQuestions?.warrantyInfo || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), warrantyInfo: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: 6 meses de garantía en motor y transmisión"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Política de Cambio (Trade-in)</label>
              <input
                type="text"
                value={config.profileQuestions?.tradeInPolicy || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), tradeInPolicy: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Aceptamos vehículos en cambio, evaluamos en el momento"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Opciones de Entrega</label>
              <input
                type="text"
                value={config.profileQuestions?.deliveryOptions || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), deliveryOptions: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Entrega a domicilio disponible, costo adicional según distancia"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Horarios de Atención</label>
              <input
                type="text"
                value={config.profileQuestions?.businessHours || ''}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  profileQuestions: { ...(prev.profileQuestions || {}), businessHours: e.target.value },
                }))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Lunes a Viernes 9am-7pm, Sábados 9am-5pm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Preferencias de Contacto</label>
            <textarea
              value={config.profileQuestions?.contactPreferences || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), contactPreferences: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: Prefiero WhatsApp para comunicación rápida. También respondo llamadas durante horario laboral. Para consultas urgentes, mejor llamar directamente."
            />
            <p className="text-xs text-gray-500 mt-1">¿Cómo prefieres que los clientes te contacten?</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Estilo de Respuesta Preferido</label>
            <textarea
              value={config.profileQuestions?.responseStyle || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), responseStyle: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: Respuestas directas y al grano, pero siempre amables. Uso emojis ocasionalmente para hacer más amigable la conversación. Siempre incluyo información relevante sobre el vehículo."
            />
            <p className="text-xs text-gray-500 mt-1">¿Cómo te gusta comunicarte con los clientes?</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Preguntas Frecuentes que Recibes</label>
            <textarea
              value={config.profileQuestions?.commonQuestions || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), commonQuestions: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="Ej: ¿El precio es negociable? ¿Aceptan cambio? ¿Tienen financiamiento? ¿Cuál es el historial del vehículo? ¿Puedo hacer una prueba de manejo?"
            />
            <p className="text-xs text-gray-500 mt-1">Lista las preguntas más comunes que te hacen los clientes</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Límites y Políticas (Lo que Nunca Harías)</label>
            <textarea
              value={config.profileQuestions?.dealBreakers || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), dealBreakers: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Ej: No negociamos precios por debajo del costo. No aceptamos cheques sin verificación. No entregamos vehículos sin pago completo o financiamiento aprobado."
            />
            <p className="text-xs text-gray-500 mt-1">Políticas estrictas o cosas que nunca harías en una venta</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Historias de Éxito o Casos Destacados</label>
            <textarea
              value={config.profileQuestions?.successStories || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                profileQuestions: { ...(prev.profileQuestions || {}), successStories: e.target.value },
              }))}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="Ej: Hemos ayudado a más de 500 familias a encontrar su vehículo ideal. Tenemos clientes que vuelven a comprarnos su segundo y tercer vehículo. Ofrecemos servicio post-venta excepcional con calificación promedio de 4.8 estrellas."
            />
            <p className="text-xs text-gray-500 mt-1">Casos de éxito, testimonios o logros que quieras que la IA mencione</p>
          </div>

          {/* SECCIÓN EXPANDIDA: Información de Contacto y Ubicación Detallada */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">📍 Información de Contacto y Ubicación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dirección Completa</label>
                <input
                  type="text"
                  value={config.profileQuestions?.address || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), address: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: Av. Principal 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ciudad</label>
                <input
                  type="text"
                  value={config.profileQuestions?.city || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), city: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: Ciudad de México"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estado/Provincia</label>
                <input
                  type="text"
                  value={config.profileQuestions?.state || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), state: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: CDMX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Código Postal</label>
                <input
                  type="text"
                  value={config.profileQuestions?.zipCode || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), zipCode: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: 12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono Principal</label>
                <input
                  type="tel"
                  value={config.profileQuestions?.phone || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), phone: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: +52 55 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sitio Web</label>
                <input
                  type="url"
                  value={config.profileQuestions?.website || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), website: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: https://www.miempresa.com"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Redes Sociales</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Facebook</label>
                  <input
                    type="text"
                    value={config.profileQuestions?.socialMedia?.facebook || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        socialMedia: { ...(prev.profileQuestions?.socialMedia || {}), facebook: e.target.value },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="@miempresa"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={config.profileQuestions?.socialMedia?.instagram || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        socialMedia: { ...(prev.profileQuestions?.socialMedia || {}), instagram: e.target.value },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="@miempresa"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Twitter/X</label>
                  <input
                    type="text"
                    value={config.profileQuestions?.socialMedia?.twitter || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        socialMedia: { ...(prev.profileQuestions?.socialMedia || {}), twitter: e.target.value },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="@miempresa"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">TikTok</label>
                  <input
                    type="text"
                    value={config.profileQuestions?.socialMedia?.tiktok || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        socialMedia: { ...(prev.profileQuestions?.socialMedia || {}), tiktok: e.target.value },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded text-sm"
                    placeholder="@miempresa"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN EXPANDIDA: Procesos y Workflows */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">⚙️ Procesos y Workflows (Para Automatización)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Proceso de Venta Paso a Paso</label>
                <textarea
                  value={config.profileQuestions?.salesProcess || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), salesProcess: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                  placeholder="Ej: 1) Recepción del lead, 2) Calificación inicial, 3) Presentación de vehículos, 4) Prueba de manejo, 5) Negociación, 6) Cierre, 7) Entrega"
                />
                <p className="text-xs text-gray-500 mt-1">Describe tu proceso de venta para que la IA pueda guiar a los clientes automáticamente</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cómo Calificas Leads</label>
                <textarea
                  value={config.profileQuestions?.leadQualification || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), leadQualification: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Pregunto presupuesto, tiempo de compra, vehículo de interés, método de pago preferido"
                />
                <p className="text-xs text-gray-500 mt-1">La IA usará esto para calificar leads automáticamente</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Proceso de Citas</label>
                <textarea
                  value={config.profileQuestions?.appointmentProcess || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), appointmentProcess: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Confirmar disponibilidad, verificar vehículo disponible, enviar recordatorio 24h antes, preparar vehículo"
                />
                <p className="text-xs text-gray-500 mt-1">La IA puede programar y gestionar citas automáticamente</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Proceso de Seguimiento</label>
                <textarea
                  value={config.profileQuestions?.followUpProcess || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), followUpProcess: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Seguimiento a las 24h, luego a los 3 días, luego a la semana, mensual si no hay respuesta"
                />
                <p className="text-xs text-gray-500 mt-1">La IA seguirá este proceso automáticamente</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN EXPANDIDA: Reglas de Automatización */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">Reglas de Automatización 24/7</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cuándo Responder Automáticamente</label>
                <textarea
                  value={config.profileQuestions?.autoResponseRules?.whenToRespond || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: {
                      ...(prev.profileQuestions || {}),
                      autoResponseRules: {
                        ...(prev.profileQuestions?.autoResponseRules || {}),
                        whenToRespond: e.target.value,
                      },
                    },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Responder automáticamente a preguntas sobre precios, disponibilidad, horarios, ubicación. No responder automáticamente a objeciones complejas o negociaciones."
                />
                <p className="text-xs text-gray-500 mt-1">Define cuándo la IA debe responder sin tu aprobación</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cuándo Escalar a Humano</label>
                <textarea
                  value={config.profileQuestions?.autoResponseRules?.whenToEscalate || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: {
                      ...(prev.profileQuestions || {}),
                      autoResponseRules: {
                        ...(prev.profileQuestions?.autoResponseRules || {}),
                        whenToEscalate: e.target.value,
                      },
                    },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Escalar cuando el cliente quiere negociar precio, tiene objeciones complejas, quiere hablar con gerente, o menciona palabras como 'urgente', 'problema', 'queja'"
                />
                <p className="text-xs text-gray-500 mt-1">La IA escalará automáticamente en estas situaciones</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cuándo Programar Citas Automáticamente</label>
                <textarea
                  value={config.profileQuestions?.autoResponseRules?.whenToSchedule || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: {
                      ...(prev.profileQuestions || {}),
                      autoResponseRules: {
                        ...(prev.profileQuestions?.autoResponseRules || {}),
                        whenToSchedule: e.target.value,
                      },
                    },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  placeholder="Ej: Cuando el cliente pregunta por prueba de manejo, quiere ver un vehículo específico, o menciona 'visitar', 'ver', 'probar'"
                />
                <p className="text-xs text-gray-500 mt-1">La IA puede programar citas automáticamente en estos casos</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cuándo Enviar Seguimientos Automáticos</label>
                <textarea
                  value={config.profileQuestions?.autoResponseRules?.whenToSendFollowUp || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: {
                      ...(prev.profileQuestions || {}),
                      autoResponseRules: {
                        ...(prev.profileQuestions?.autoResponseRules || {}),
                        whenToSendFollowUp: e.target.value,
                      },
                    },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  placeholder="Ej: Si no hay respuesta en 24h, si el lead está caliente pero no ha respondido en 3 días, si hay un vehículo nuevo que coincide con su interés"
                />
                <p className="text-xs text-gray-500 mt-1">La IA enviará seguimientos automáticos según estas reglas</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN EXPANDIDA: Preferencias de Comunicación por Canal */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">💬 Preferencias de Comunicación por Canal</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo de Respuesta Objetivo - WhatsApp (minutos)</label>
                  <input
                    type="number"
                    value={config.profileQuestions?.responseTimeGoals?.whatsapp || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        responseTimeGoals: {
                          ...(prev.profileQuestions?.responseTimeGoals || {}),
                          whatsapp: parseInt(e.target.value) || undefined,
                        },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo de Respuesta Objetivo - Email (horas)</label>
                  <input
                    type="number"
                    value={config.profileQuestions?.responseTimeGoals?.email || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        responseTimeGoals: {
                          ...(prev.profileQuestions?.responseTimeGoals || {}),
                          email: parseInt(e.target.value) || undefined,
                        },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo de Respuesta Objetivo - Teléfono (minutos)</label>
                  <input
                    type="number"
                    value={config.profileQuestions?.responseTimeGoals?.phone || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        responseTimeGoals: {
                          ...(prev.profileQuestions?.responseTimeGoals || {}),
                          phone: parseInt(e.target.value) || undefined,
                        },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo de Respuesta Objetivo - SMS (minutos)</label>
                  <input
                    type="number"
                    value={config.profileQuestions?.responseTimeGoals?.sms || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      profileQuestions: {
                        ...(prev.profileQuestions || {}),
                        responseTimeGoals: {
                          ...(prev.profileQuestions?.responseTimeGoals || {}),
                          sms: parseInt(e.target.value) || undefined,
                        },
                      },
                    }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: 10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN EXPANDIDA: Información Adicional para Automatización */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">Información Adicional para Mejor Automatización</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Número de Empleados</label>
                <input
                  type="number"
                  value={config.profileQuestions?.numberOfEmployees || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), numberOfEmployees: parseInt(e.target.value) || undefined },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: 15"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Volumen Anual de Ventas (aproximado)</label>
                <input
                  type="number"
                  value={config.profileQuestions?.annualSalesVolume || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), annualSalesVolume: parseInt(e.target.value) || undefined },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej: 500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Número aproximado de vehículos vendidos por año</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Problemas Comunes de los Clientes</label>
                <textarea
                  value={config.profileQuestions?.customerPainPoints || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), customerPainPoints: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Presupuesto limitado, necesidad de financiamiento, urgencia por cambio de vehículo, preocupación por historial del vehículo"
                />
                <p className="text-xs text-gray-500 mt-1">La IA puede abordar estos problemas proactivamente</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Objetivos Comunes de los Clientes</label>
                <textarea
                  value={config.profileQuestions?.customerGoals || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), customerGoals: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ej: Encontrar vehículo confiable, obtener mejor precio, proceso rápido, financiamiento aprobado"
                />
                <p className="text-xs text-gray-500 mt-1">La IA puede ayudar a los clientes a alcanzar estos objetivos</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Instrucciones Especiales para la IA</label>
                <textarea
                  value={config.profileQuestions?.specialInstructions || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    profileQuestions: { ...(prev.profileQuestions || {}), specialInstructions: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                  placeholder="Ej: Siempre menciona nuestra garantía extendida. Nunca prometas descuentos sin confirmar conmigo primero. Si un cliente menciona 'urgente', escalar inmediatamente."
                />
                <p className="text-xs text-gray-500 mt-1">Reglas específicas que quieres que la IA siga siempre</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Predicción y Análisis Predictivo */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🔮 Predicción y Análisis Predictivo</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.predictive?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                predictive: { ...prev.predictive, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA predice probabilidades de conversión, tiempos de venta y demanda de vehículos
        </p>
        {config.predictive?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.predictive?.predictLeadConversion}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  predictive: { ...prev.predictive, predictLeadConversion: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice probabilidad de cierre de leads</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.predictive?.predictTimeToSale}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  predictive: { ...prev.predictive, predictTimeToSale: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice tiempo hasta venta</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.predictive?.predictInventoryTurnover}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  predictive: { ...prev.predictive, predictInventoryTurnover: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice rotación de inventario</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.predictive?.predictVehicleDemand}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  predictive: { ...prev.predictive, predictVehicleDemand: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice demanda por tipo de vehículo</span>
            </label>
          </div>
        )}
      </div>

      {/* Optimización de Campañas */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📢 Optimización de Campañas</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.campaignOptimization?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                campaignOptimization: { ...prev.campaignOptimization, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA optimiza presupuestos, audiencias y horarios de publicación automáticamente
        </p>
        {config.campaignOptimization?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.campaignOptimization?.optimizeBudget}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  campaignOptimization: { ...prev.campaignOptimization, optimizeBudget: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Optimiza presupuestos automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.campaignOptimization?.suggestAudiences}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  campaignOptimization: { ...prev.campaignOptimization, suggestAudiences: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Sugiere audiencias objetivo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.campaignOptimization?.optimizePostingSchedule}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  campaignOptimization: { ...prev.campaignOptimization, optimizePostingSchedule: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Optimiza horarios de publicación</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.campaignOptimization?.abTesting}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  campaignOptimization: { ...prev.campaignOptimization, abTesting: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">A/B testing automático de mensajes</span>
            </label>
          </div>
        )}
      </div>

      {/* Personalización Avanzada */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Personalización Avanzada</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.advancedPersonalization?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                advancedPersonalization: { ...prev.advancedPersonalization, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA personaliza mensajes, recomienda vehículos y adapta promociones según el perfil del cliente
        </p>
        {config.advancedPersonalization?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedPersonalization?.personalizeMessages}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedPersonalization: { ...prev.advancedPersonalization, personalizeMessages: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Personaliza mensajes por perfil del cliente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedPersonalization?.recommendVehicles}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedPersonalization: { ...prev.advancedPersonalization, recommendVehicles: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Recomienda vehículos basado en historial</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedPersonalization?.personalizePromotions}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedPersonalization: { ...prev.advancedPersonalization, personalizePromotions: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Personaliza promociones por cliente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedPersonalization?.adaptiveContent}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedPersonalization: { ...prev.advancedPersonalization, adaptiveContent: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Contenido adaptativo según comportamiento</span>
            </label>
          </div>
        )}
      </div>

      {/* Análisis de Competencia */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🏆 Análisis de Competencia</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.competitorAnalysis?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                competitorAnalysis: { ...prev.competitorAnalysis, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA analiza precios de mercado, compara con competidores e identifica oportunidades
        </p>
        {config.competitorAnalysis?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.competitorAnalysis?.analyzeMarketPricing}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  competitorAnalysis: { ...prev.competitorAnalysis, analyzeMarketPricing: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analiza precios de mercado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.competitorAnalysis?.compareCompetitors}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  competitorAnalysis: { ...prev.competitorAnalysis, compareCompetitors: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Compara con competidores</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.competitorAnalysis?.identifyOpportunities}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  competitorAnalysis: { ...prev.competitorAnalysis, identifyOpportunities: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Identifica oportunidades de mercado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.competitorAnalysis?.analyzeTrends}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  competitorAnalysis: { ...prev.competitorAnalysis, analyzeTrends: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analiza tendencias del sector</span>
            </label>
          </div>
        )}
      </div>

      {/* Automatización Avanzada */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">⚡ Automatización Avanzada</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.advancedAutomation?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                advancedAutomation: { ...prev.advancedAutomation, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA escala leads críticos, asigna leads a vendedores y programa seguimientos automáticamente
        </p>
        {config.advancedAutomation?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedAutomation?.autoEscalateLeads}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedAutomation: { ...prev.advancedAutomation, autoEscalateLeads: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Escala leads críticos automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedAutomation?.autoAssignLeads}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedAutomation: { ...prev.advancedAutomation, autoAssignLeads: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Asigna leads a vendedores automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedAutomation?.autoScheduleFollowups}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedAutomation: { ...prev.advancedAutomation, autoScheduleFollowups: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Programa seguimientos automáticamente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedAutomation?.detectPurchaseIntent}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedAutomation: { ...prev.advancedAutomation, detectPurchaseIntent: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Detecta intención de compra automáticamente</span>
            </label>
          </div>
        )}
      </div>

      {/* Análisis de Sentimiento Avanzado */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">😊 Análisis de Sentimiento Avanzado</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.advancedSentiment?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                advancedSentiment: { ...prev.advancedSentiment, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA detecta emociones, alerta sobre insatisfacción y predice abandono de leads
        </p>
        {config.advancedSentiment?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedSentiment?.detectEmotions}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedSentiment: { ...prev.advancedSentiment, detectEmotions: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Detecta emociones en conversaciones</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedSentiment?.dissatisfactionAlerts}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedSentiment: { ...prev.advancedSentiment, dissatisfactionAlerts: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Alertas tempranas de clientes insatisfechos</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedSentiment?.analyzeTone}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedSentiment: { ...prev.advancedSentiment, analyzeTone: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analiza tono y lenguaje</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedSentiment?.predictAbandonment}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedSentiment: { ...prev.advancedSentiment, predictAbandonment: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice abandono de leads</span>
            </label>
          </div>
        )}
      </div>

      {/* Optimización de Inventario */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📦 Optimización de Inventario</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.inventoryOptimization?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                inventoryOptimization: { ...prev.inventoryOptimization, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA sugiere qué vehículos comprar, analiza rentabilidad y optimiza el mix de inventario
        </p>
        {config.inventoryOptimization?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.inventoryOptimization?.suggestPurchases}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  inventoryOptimization: { ...prev.inventoryOptimization, suggestPurchases: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Sugiere qué vehículos comprar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.inventoryOptimization?.analyzeProfitability}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  inventoryOptimization: { ...prev.inventoryOptimization, analyzeProfitability: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analiza rentabilidad por vehículo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.inventoryOptimization?.optimizeMix}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  inventoryOptimization: { ...prev.inventoryOptimization, optimizeMix: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Optimiza mix de inventario</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.inventoryOptimization?.predictSeasonalDemand}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  inventoryOptimization: { ...prev.inventoryOptimization, predictSeasonalDemand: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice demanda estacional</span>
            </label>
          </div>
        )}
      </div>

      {/* Análisis de Rendimiento */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">📈 Análisis de Rendimiento</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.performanceAnalysis?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                performanceAnalysis: { ...prev.performanceAnalysis, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA analiza rendimiento de vendedores, identifica mejores prácticas y realiza benchmarking
        </p>
        {config.performanceAnalysis?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.performanceAnalysis?.analyzeSellerPerformance}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  performanceAnalysis: { ...prev.performanceAnalysis, analyzeSellerPerformance: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analiza rendimiento por vendedor</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.performanceAnalysis?.identifyBestPractices}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  performanceAnalysis: { ...prev.performanceAnalysis, identifyBestPractices: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Identifica mejores prácticas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.performanceAnalysis?.suggestImprovements}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  performanceAnalysis: { ...prev.performanceAnalysis, suggestImprovements: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Sugiere mejoras continuas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.performanceAnalysis?.autoBenchmarking}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  performanceAnalysis: { ...prev.performanceAnalysis, autoBenchmarking: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Benchmarking automático</span>
            </label>
          </div>
        )}
      </div>

      {/* Chatbot Avanzado */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Chatbot Avanzado</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.advancedChatbot?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                advancedChatbot: { ...prev.advancedChatbot, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Chatbot conversacional 24/7 con integración de inventario en tiempo real y multi-idioma
        </p>
        {config.advancedChatbot?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedChatbot?.available247}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedChatbot: { ...prev.advancedChatbot, available247: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Disponible 24/7</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedChatbot?.realTimeInventory}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedChatbot: { ...prev.advancedChatbot, realTimeInventory: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Integración con inventario en tiempo real</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedChatbot?.multiLanguage}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedChatbot: { ...prev.advancedChatbot, multiLanguage: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Multi-idioma automático</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.advancedChatbot?.conversationalAI}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advancedChatbot: { ...prev.advancedChatbot, conversationalAI: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">IA conversacional avanzada</span>
            </label>
          </div>
        )}
      </div>

      {/* Análisis de ROI */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Análisis de ROI</h2>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.roiAnalysis?.enabled}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                roiAnalysis: { ...prev.roiAnalysis, enabled: e.target.checked },
              }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          La IA calcula ROI por campaña, analiza costo por lead y optimiza inversión en marketing
        </p>
        {config.roiAnalysis?.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.roiAnalysis?.calculateCampaignROI}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  roiAnalysis: { ...prev.roiAnalysis, calculateCampaignROI: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Calcula ROI por campaña</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.roiAnalysis?.analyzeCostPerLead}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  roiAnalysis: { ...prev.roiAnalysis, analyzeCostPerLead: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Analiza costo por lead</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.roiAnalysis?.optimizeMarketingInvestment}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  roiAnalysis: { ...prev.roiAnalysis, optimizeMarketingInvestment: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Optimiza inversión en marketing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.roiAnalysis?.predictROI}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  roiAnalysis: { ...prev.roiAnalysis, predictROI: e.target.checked },
                }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Predice retorno de inversión</span>
            </label>
          </div>
        )}
      </div>

      {/* Personalización */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎨 Personalización</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tono</label>
            <select
              value={config.tone}
              onChange={(e) => setConfig(prev => ({ ...prev, tone: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="professional">Profesional</option>
              <option value="friendly">Amigable</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Idioma</label>
            <select
              value={config.language}
              onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Instrucciones Personalizadas</label>
            <textarea
              value={config.customInstructions}
              onChange={(e) => setConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              placeholder="Ej: Siempre menciona el precio en los mensajes. Usa emojis moderadamente..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Instrucciones específicas para que la IA siga al generar contenido
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de éxito/error */}
      {message && (
        <div
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}

