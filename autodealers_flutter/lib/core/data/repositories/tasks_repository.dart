// Repositorio de Tasks - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class TasksRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener tasks (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchTasks({
    String? tenantId,
    String? assignedTo,
    bool? completed,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('tasks');

    if (assignedTo != null) {
      query = query.where('assignedTo', isEqualTo: assignedTo);
    }
    if (completed != null) {
      query = query.where('completed', isEqualTo: completed);
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
            'completedAt': data['completedAt']?.toDate(),
          };
        })
        .toList());
  }

  // Crear task
  Future<String> createTask({
    required String tenantId,
    required Map<String, dynamic> task,
  }) async {
    try {
      final result = await _functions.httpsCallable('createTask').call({
        'tenantId': tenantId,
        'task': task,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear task: $e');
    }
  }

  // Obtener tasks
  Future<List<Map<String, dynamic>>> getTasks({
    required String tenantId,
    String? assignedTo,
    bool? completed,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getTasks').call({
        'tenantId': tenantId,
        'assignedTo': assignedTo,
        'completed': completed,
        'limit': limit,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['tasks'] as List);
    } catch (e) {
      throw Exception('Error al obtener tasks: $e');
    }
  }

  // Actualizar task
  Future<void> updateTask({
    required String tenantId,
    required String taskId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateTask').call({
        'tenantId': tenantId,
        'taskId': taskId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar task: $e');
    }
  }

  // Completar task
  Future<void> completeTask({
    required String tenantId,
    required String taskId,
  }) async {
    try {
      await _functions.httpsCallable('completeTask').call({
        'tenantId': tenantId,
        'taskId': taskId,
      });
    } catch (e) {
      throw Exception('Error al completar task: $e');
    }
  }

  // Eliminar task
  Future<void> deleteTask({
    required String tenantId,
    required String taskId,
  }) async {
    try {
      await _functions.httpsCallable('deleteTask').call({
        'tenantId': tenantId,
        'taskId': taskId,
      });
    } catch (e) {
      throw Exception('Error al eliminar task: $e');
    }
  }
}


