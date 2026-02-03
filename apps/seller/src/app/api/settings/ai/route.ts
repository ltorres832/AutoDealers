import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

// Obtener configuración de IA del tenant
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configDoc = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('settings')
      .doc('ai_config')
      .get();

    if (configDoc.exists) {
      return NextResponse.json({ config: configDoc.data() });
    }

    // Retornar configuración por defecto
    return NextResponse.json({
      config: {
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
        profileQuestions: {},
      },
    });
  } catch (error: any) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Guardar configuración de IA del tenant
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await request.json();

    await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('settings')
      .doc('ai_config')
      .set({
        ...config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.userId,
      }, { merge: true });

    return NextResponse.json({ success: true, message: 'Configuración de IA guardada exitosamente' });
  } catch (error: any) {
    console.error('Error saving AI config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

