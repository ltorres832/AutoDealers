// Cloud Functions para IA
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { AIClassifier } from '@autodealers/ai';
import { AIAssistant } from '@autodealers/ai';
import { AIContentGenerator } from '@autodealers/ai';

// Clasificar lead
export const classifyLead = onCall(async (request) => {
  const { leadInfo } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!leadInfo) {
    throw new HttpsError('invalid-argument', 'leadInfo es requerido');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API Key no configurada');
    }

    const classifier = new AIClassifier(apiKey);
    const classification = await classifier.classifyLead(leadInfo);

    return { classification };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al clasificar lead: ${error.message}`);
  }
});

// Generar respuesta automática
export const generateResponse = onCall(async (request) => {
  const { context, message, leadHistory } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!context || !message) {
    throw new HttpsError('invalid-argument', 'context y message son requeridos');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API Key no configurada');
    }

    const assistant = new AIAssistant(apiKey);
    const response = await assistant.generateResponse(context, message, leadHistory);

    return { response };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar respuesta: ${error.message}`);
  }
});

// Generar contenido
export const generateContent = onCall(async (request) => {
  const { type, prompt, context } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!type || !prompt) {
    throw new HttpsError('invalid-argument', 'type y prompt son requeridos');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API Key no configurada');
    }

    const generator = new AIContentGenerator(apiKey);
    const content = await generator.generateContent(type, prompt, context);

    return { content };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al generar contenido: ${error.message}`);
  }
});

// Analizar conversación
export const analyzeConversation = onCall(async (request) => {
  const { messages } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!messages || !Array.isArray(messages)) {
    throw new HttpsError('invalid-argument', 'messages (array) es requerido');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API Key no configurada');
    }

    const assistant = new AIAssistant(apiKey);
    const analysis = await assistant.analyzeConversation(messages);

    return { analysis };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al analizar conversación: ${error.message}`);
  }
});

// Sugerir vehículos
export const suggestVehicles = onCall(async (request) => {
  const { tenantId, leadInfo, availableVehicles } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!tenantId || !leadInfo || !availableVehicles) {
    throw new HttpsError('invalid-argument', 'tenantId, leadInfo y availableVehicles son requeridos');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API Key no configurada');
    }

    // TODO: Implementar sugerencia de vehículos con IA
    return { suggestions: [] };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al sugerir vehículos: ${error.message}`);
  }
});

// Optimizar precio
export const optimizePrice = onCall(async (request) => {
  const { vehicleId, marketData } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  if (!vehicleId || !marketData) {
    throw new HttpsError('invalid-argument', 'vehicleId y marketData son requeridos');
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API Key no configurada');
    }

    // TODO: Implementar optimización de precio con IA
    return { optimizedPrice: 0, reasoning: '' };
  } catch (error: any) {
    throw new HttpsError('internal', `Error al optimizar precio: ${error.message}`);
  }
});


