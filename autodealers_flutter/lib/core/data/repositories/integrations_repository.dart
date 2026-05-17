// Repositorio de Integrations - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../config/firebase_config.dart';

class IntegrationsRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<List<Map<String, dynamic>>> getIntegrations(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getIntegrations').call({
        'tenantId': tenantId,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['integrations'] as List);
    } catch (e) {
      throw Exception('Error al obtener integraciones: $e');
    }
  }

  Stream<List<Map<String, dynamic>>> watchIntegrations(String tenantId) {
    return _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        return {
          'id': doc.id,
          ...data,
        };
      }).toList();
    });
  }

  Future<Map<String, dynamic>> saveCredentials({
    required String tenantId,
    required String type,
    required Map<String, dynamic> credentials,
  }) async {
    try {
      final result = await _functions.httpsCallable('saveIntegrationCredentials').call({
        'tenantId': tenantId,
        'type': type,
        'credentials': credentials,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al guardar credenciales: $e');
    }
  }

  Future<Map<String, dynamic>> connectIntegration({
    required String tenantId,
    required String type,
    Map<String, dynamic>? credentials,
  }) async {
    try {
      final result = await _functions.httpsCallable('connectIntegration').call({
        'tenantId': tenantId,
        'type': type,
        if (credentials != null) 'credentials': credentials,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al conectar integración: $e');
    }
  }

  Future<bool> disconnectIntegration({
    required String tenantId,
    required String integrationId,
  }) async {
    try {
      await _functions.httpsCallable('disconnectIntegration').call({
        'tenantId': tenantId,
        'integrationId': integrationId,
      });
      return true;
    } catch (e) {
      throw Exception('Error al desconectar integración: $e');
    }
  }
}


