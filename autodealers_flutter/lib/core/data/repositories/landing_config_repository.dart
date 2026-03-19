// Repositorio de Landing Config - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class LandingConfigRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener configuración de landing (stream en tiempo real)
  Stream<Map<String, dynamic>?> watchLandingConfig({String? tenantId}) {
    final finalTenantId = tenantId ?? '';

    return _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('settings')
        .doc('landing_config')
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      return doc.data();
    });
  }

  // Obtener configuración de landing
  Future<Map<String, dynamic>> getLandingConfig({required String tenantId}) async {
    try {
      final result = await _functions.httpsCallable('getLandingConfig').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración de landing: $e');
    }
  }

  // Obtener configuración pública de landing (sin autenticación)
  Future<Map<String, dynamic>> getPublicLandingConfig({required String tenantId}) async {
    try {
      final result = await _functions.httpsCallable('getPublicLandingConfig').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración pública de landing: $e');
    }
  }

  // Actualizar configuración de landing
  Future<void> updateLandingConfig({
    required String tenantId,
    required Map<String, dynamic> config,
  }) async {
    try {
      await _functions.httpsCallable('updateLandingConfig').call({
        'tenantId': tenantId,
        'config': config,
      });
    } catch (e) {
      throw Exception('Error al actualizar configuración de landing: $e');
    }
  }
}


