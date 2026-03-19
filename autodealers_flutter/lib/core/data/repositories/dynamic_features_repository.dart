// Repositorio de Dynamic Features - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class DynamicFeaturesRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener features dinámicas de un tenant (stream en tiempo real)
  Stream<Map<String, bool>> watchDynamicFeatures({String? tenantId}) {
    final finalTenantId = tenantId ?? '';

    return _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('settings')
        .doc('dynamic_features')
        .snapshots()
        .map((doc) {
      if (!doc.exists) return <String, bool>{};
      final data = doc.data() as Map<String, dynamic>?;
      return Map<String, bool>.from(data?['features'] ?? {});
    });
  }

  // Obtener features dinámicas de un tenant
  Future<Map<String, bool>> getDynamicFeatures({required String tenantId}) async {
    try {
      final result = await _functions.httpsCallable('getDynamicFeatures').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      return Map<String, bool>.from(data['features'] as Map? ?? {});
    } catch (e) {
      throw Exception('Error al obtener features dinámicas: $e');
    }
  }

  // Actualizar features dinámicas
  Future<void> updateDynamicFeatures({
    required String tenantId,
    required Map<String, bool> features,
  }) async {
    try {
      await _functions.httpsCallable('updateDynamicFeatures').call({
        'tenantId': tenantId,
        'features': features,
      });
    } catch (e) {
      throw Exception('Error al actualizar features dinámicas: $e');
    }
  }

  // Verificar si una feature está habilitada
  Future<bool> checkDynamicFeature({
    required String tenantId,
    required String featureKey,
  }) async {
    try {
      final result = await _functions.httpsCallable('checkDynamicFeature').call({
        'tenantId': tenantId,
        'featureKey': featureKey,
      });

      final data = result.data as Map<String, dynamic>;
      return data['enabled'] as bool? ?? false;
    } catch (e) {
      throw Exception('Error al verificar feature dinámica: $e');
    }
  }
}


