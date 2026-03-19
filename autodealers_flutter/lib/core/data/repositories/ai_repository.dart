// Repositorio de IA - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class AIRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Clasificar lead
  Future<Map<String, dynamic>> classifyLead({
    required String tenantId,
    required String leadId,
    required String message,
  }) async {
    try {
      final result = await _functions.httpsCallable('classifyLead').call({
        'tenantId': tenantId,
        'leadId': leadId,
        'message': message,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al clasificar lead: $e');
    }
  }

  // Generar respuesta automática
  Future<Map<String, dynamic>> generateResponse({
    required String tenantId,
    required String leadId,
    required String context,
  }) async {
    try {
      final result = await _functions.httpsCallable('generateResponse').call({
        'tenantId': tenantId,
        'leadId': leadId,
        'context': context,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar respuesta: $e');
    }
  }

  // Generar contenido
  Future<Map<String, dynamic>> generateContent({
    required String tenantId,
    required String type,
    required String prompt,
  }) async {
    try {
      final result = await _functions.httpsCallable('generateContent').call({
        'tenantId': tenantId,
        'type': type,
        'prompt': prompt,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar contenido: $e');
    }
  }

  // Analizar sentimiento
  Future<Map<String, dynamic>> analyzeSentiment({
    required String tenantId,
    required String text,
  }) async {
    try {
      final result = await _functions.httpsCallable('analyzeSentiment').call({
        'tenantId': tenantId,
        'text': text,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al analizar sentimiento: $e');
    }
  }
}


