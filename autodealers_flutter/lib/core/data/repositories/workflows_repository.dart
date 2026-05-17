// Repositorio de Workflows - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class WorkflowsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener workflows (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchWorkflows({
    String? tenantId,
    String? status,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('workflows');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    query = query.orderBy('createdAt', descending: true).limit(100);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'createdAt': data['createdAt']?.toDate(),
            'updatedAt': data['updatedAt']?.toDate(),
          };
        })
        .toList());
  }

  // Crear workflow
  Future<String> createWorkflow({
    required String tenantId,
    required Map<String, dynamic> workflow,
  }) async {
    try {
      final result = await _functions.httpsCallable('createWorkflow').call({
        'tenantId': tenantId,
        'workflow': workflow,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear workflow: $e');
    }
  }

  // Obtener workflows
  Future<List<Map<String, dynamic>>> getWorkflows({
    required String tenantId,
    String? status,
  }) async {
    try {
      final result = await _functions.httpsCallable('getWorkflows').call({
        'tenantId': tenantId,
        'status': status,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['workflows'] as List);
    } catch (e) {
      throw Exception('Error al obtener workflows: $e');
    }
  }

  // Actualizar workflow
  Future<void> updateWorkflow({
    required String tenantId,
    required String workflowId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateWorkflow').call({
        'tenantId': tenantId,
        'workflowId': workflowId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar workflow: $e');
    }
  }

  // Eliminar workflow
  Future<void> deleteWorkflow({
    required String tenantId,
    required String workflowId,
  }) async {
    try {
      await _functions.httpsCallable('deleteWorkflow').call({
        'tenantId': tenantId,
        'workflowId': workflowId,
      });
    } catch (e) {
      throw Exception('Error al eliminar workflow: $e');
    }
  }
}


