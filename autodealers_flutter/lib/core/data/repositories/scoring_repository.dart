// Repositorio de Scoring - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class ScoringRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  Future<List<Map<String, dynamic>>> getScoringConfig(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getScoringConfig').call({
        'tenantId': tenantId,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['rules'] as List);
    } catch (e) {
      throw Exception('Error al obtener configuración de scoring: $e');
    }
  }

  Future<Map<String, dynamic>> createScoringRule({
    required String tenantId,
    required Map<String, dynamic> rule,
  }) async {
    try {
      final result = await _functions.httpsCallable('createScoringRule').call({
        'tenantId': tenantId,
        'rule': rule,
      });
      final data = result.data as Map<String, dynamic>;
      return data['rule'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear regla de scoring: $e');
    }
  }

  Future<Map<String, dynamic>> updateScoringRule({
    required String tenantId,
    required String ruleId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final result = await _functions.httpsCallable('updateScoringRule').call({
        'tenantId': tenantId,
        'ruleId': ruleId,
        'updates': updates,
      });
      final data = result.data as Map<String, dynamic>;
      return data['rule'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar regla de scoring: $e');
    }
  }

  Future<bool> deleteScoringRule({
    required String tenantId,
    required String ruleId,
  }) async {
    try {
      await _functions.httpsCallable('deleteScoringRule').call({
        'tenantId': tenantId,
        'ruleId': ruleId,
      });
      return true;
    } catch (e) {
      throw Exception('Error al eliminar regla de scoring: $e');
    }
  }
}


