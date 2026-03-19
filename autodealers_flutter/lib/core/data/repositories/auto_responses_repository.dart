// Repositorio de Auto-Responses - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class AutoResponsesRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener respuestas automáticas (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchAutoResponses({
    String? tenantId,
    bool activeOnly = true,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('auto_responses');

    if (activeOnly) {
      query = query.where('isActive', isEqualTo: true);
    }

    query = query.orderBy('priority', descending: true);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
              final data = doc.data() as Map<String, dynamic>;
              return {
                'id': doc.id,
                ...data,
                'createdAt': data['createdAt']?.toDate(),
                'updatedAt': data['updatedAt']?.toDate(),
              } as Map<String, dynamic>;
            })
        .toList());
  }

  // Obtener respuestas automáticas
  Future<List<Map<String, dynamic>>> getAutoResponses({
    required String tenantId,
    bool activeOnly = true,
  }) async {
    try {
      final result = await _functions.httpsCallable('getAutoResponses').call({
        'tenantId': tenantId,
        'activeOnly': activeOnly,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['responses'] as List);
    } catch (e) {
      throw Exception('Error al obtener respuestas automáticas: $e');
    }
  }

  // Crear respuesta automática
  Future<String> createAutoResponse({
    required String tenantId,
    required Map<String, dynamic> response,
  }) async {
    try {
      final result = await _functions.httpsCallable('createAutoResponse').call({
        'tenantId': tenantId,
        ...response,
      });

      final data = result.data as Map<String, dynamic>;
      return (data['response'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear respuesta automática: $e');
    }
  }

  // Actualizar respuesta automática
  Future<void> updateAutoResponse({
    required String tenantId,
    required String responseId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateAutoResponse').call({
        'tenantId': tenantId,
        'responseId': responseId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar respuesta automática: $e');
    }
  }

  // Eliminar respuesta automática
  Future<void> deleteAutoResponse({
    required String tenantId,
    required String responseId,
  }) async {
    try {
      await _functions.httpsCallable('deleteAutoResponse').call({
        'tenantId': tenantId,
        'responseId': responseId,
      });
    } catch (e) {
      throw Exception('Error al eliminar respuesta automática: $e');
    }
  }
}


