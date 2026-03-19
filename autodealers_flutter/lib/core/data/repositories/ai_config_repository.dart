// Repositorio de AI Config - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class AIConfigRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener configuración de IA (solo admin)
  Future<Map<String, dynamic>> getAIConfig() async {
    try {
      final result = await _functions.httpsCallable('getAIConfig').call();
      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración de IA: $e');
    }
  }

  // Actualizar configuración de IA (solo admin)
  Future<void> updateAIConfig(Map<String, dynamic> config) async {
    try {
      await _functions.httpsCallable('updateAIConfig').call({
        'config': config,
      });
    } catch (e) {
      throw Exception('Error al actualizar configuración de IA: $e');
    }
  }

  // Obtener configuración de IA para un tenant específico
  Future<Map<String, dynamic>> getTenantAIConfig(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getTenantAIConfig').call({
        'tenantId': tenantId,
      });
      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración de IA del tenant: $e');
    }
  }

  // Actualizar configuración de IA para un tenant específico
  Future<void> updateTenantAIConfig({
    required String tenantId,
    required Map<String, dynamic> config,
  }) async {
    try {
      await _functions.httpsCallable('updateTenantAIConfig').call({
        'tenantId': tenantId,
        'config': config,
      });
    } catch (e) {
      throw Exception('Error al actualizar configuración de IA del tenant: $e');
    }
  }
}


