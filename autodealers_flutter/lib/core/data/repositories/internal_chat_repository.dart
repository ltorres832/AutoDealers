// Repositorio de Internal Chat - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class InternalChatRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener usuarios para chat interno
  Future<List<Map<String, dynamic>>> getInternalChatUsers(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getInternalChatUsers').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['users'] as List);
    } catch (e) {
      throw Exception('Error al obtener usuarios: $e');
    }
  }

  // Obtener conversación (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchConversation({
    required String tenantId,
    required String otherUserId,
  }) {
    // Obtener mensajes enviados y recibidos
    final sentQuery = _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('internal_messages')
        .where('fromUserId', isEqualTo: otherUserId)
        .orderBy('createdAt', descending: true)
        .limit(100);

    final receivedQuery = _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('internal_messages')
        .where('toUserId', isEqualTo: otherUserId)
        .orderBy('createdAt', descending: true)
        .limit(100);

    // Combinar ambos streams
    return sentQuery.snapshots().asyncExpand((sentSnapshot) {
      return receivedQuery.snapshots().map((receivedSnapshot) {
        final allMessages = [
          ...sentSnapshot.docs.map((doc) {
            final data = doc.data() as Map<String, dynamic>;
            return {
              'id': doc.id,
              ...data,
              'createdAt': data['createdAt']?.toDate(),
            } as Map<String, dynamic>;
          }),
          ...receivedSnapshot.docs.map((doc) {
            final data = doc.data() as Map<String, dynamic>;
            return {
              'id': doc.id,
              ...data,
              'createdAt': data['createdAt']?.toDate(),
            } as Map<String, dynamic>;
          }),
        ];

        // Ordenar por fecha
        allMessages.sort((a, b) {
          final dateA = a['createdAt'] as DateTime?;
          final dateB = b['createdAt'] as DateTime?;
          if (dateA == null || dateB == null) return 0;
          return dateA.compareTo(dateB);
        });

        return allMessages;
      });
    });
  }

  // Enviar mensaje interno
  Future<String> sendInternalMessage({
    required String tenantId,
    required String toUserId,
    required String message,
    String? type,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendInternalMessage').call({
        'tenantId': tenantId,
        'toUserId': toUserId,
        'message': message,
        'type': type,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al enviar mensaje: $e');
    }
  }

  // Marcar mensajes como leídos
  Future<void> markMessagesAsRead({
    required String tenantId,
    required String fromUserId,
  }) async {
    try {
      await _functions.httpsCallable('markMessagesAsRead').call({
        'tenantId': tenantId,
        'fromUserId': fromUserId,
      });
    } catch (e) {
      throw Exception('Error al marcar mensajes como leídos: $e');
    }
  }
}


