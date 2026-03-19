// Repositorio de Feature Flags - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class FeatureFlagsRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener feature flags de un dashboard
  Future<List<Map<String, dynamic>>> getFeatureFlags(String dashboard) async {
    try {
      final result = await _functions.httpsCallable('getFeatureFlags').call({
        'dashboard': dashboard,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['features'] as List);
    } catch (e) {
      throw Exception('Error al obtener feature flags: $e');
    }
  }

  // Verificar si una feature está habilitada
  Future<bool> checkFeatureFlag({
    required String dashboard,
    required String featureKey,
  }) async {
    try {
      final result = await _functions.httpsCallable('checkFeatureFlag').call({
        'dashboard': dashboard,
        'featureKey': featureKey,
      });

      final data = result.data as Map<String, dynamic>;
      return data['enabled'] as bool? ?? false;
    } catch (e) {
      throw Exception('Error al verificar feature flag: $e');
    }
  }

  // Actualizar feature flag (solo admin)
  Future<Map<String, dynamic>> updateFeatureFlag({
    required String dashboard,
    required String featureKey,
    required bool enabled,
    String? featureName,
    String? description,
    String? category,
  }) async {
    try {
      final result = await _functions.httpsCallable('updateFeatureFlag').call({
        'dashboard': dashboard,
        'featureKey': featureKey,
        'enabled': enabled,
        'featureName': featureName,
        'description': description,
        'category': category,
      });

      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar feature flag: $e');
    }
  }
}


