// Repositorio de Public Chat - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../config/firebase_config.dart';

class PublicChatRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<List<Map<String, dynamic>>> getConversations(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getPublicChatConversations').call({
        'tenantId': tenantId,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['conversations'] as List);
    } catch (e) {
      throw Exception('Error al obtener conversaciones: $e');
    }
  }

  Stream<List<Map<String, dynamic>>> watchConversations(String tenantId) {
    return _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      final conversationsMap = <String, Map<String, dynamic>>{};
      snapshot.docs.forEach((doc) {
        final data = doc.data() as Map<String, dynamic>;
        final sessionId = data['sessionId'] as String;
        if (!conversationsMap.containsKey(sessionId)) {
          conversationsMap[sessionId] = {
            'sessionId': sessionId,
            'clientName': data['clientName'] ?? 'Cliente',
            'lastMessage': {
              'id': doc.id,
              'content': data['content'],
              'fromClient': data['fromClient'],
              'createdAt': data['createdAt'],
            },
          };
        }
      });
      return conversationsMap.values.toList();
    });
  }

  Future<List<Map<String, dynamic>>> getMessages({
    required String tenantId,
    required String sessionId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getPublicChatMessages').call({
        'tenantId': tenantId,
        'sessionId': sessionId,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['messages'] as List);
    } catch (e) {
      throw Exception('Error al obtener mensajes: $e');
    }
  }

  Stream<List<Map<String, dynamic>>> watchMessages({
    required String tenantId,
    required String sessionId,
  }) {
    return _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .where('sessionId', isEqualTo: sessionId)
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {
          'id': doc.id,
          ...data,
        } as Map<String, dynamic>;
      }).toList();
    });
  }

  Future<Map<String, dynamic>> sendMessage({
    required String tenantId,
    required String sessionId,
    required String clientName,
    required String content,
    String? clientEmail,
    String? clientPhone,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendPublicChatMessage').call({
        'tenantId': tenantId,
        'sessionId': sessionId,
        'clientName': clientName,
        'content': content,
        if (clientEmail != null) 'clientEmail': clientEmail,
        if (clientPhone != null) 'clientPhone': clientPhone,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al enviar mensaje: $e');
    }
  }

  Future<Map<String, dynamic>> replyMessage({
    required String tenantId,
    required String sessionId,
    required String content,
  }) async {
    try {
      final result = await _functions.httpsCallable('replyPublicChatMessage').call({
        'tenantId': tenantId,
        'sessionId': sessionId,
        'content': content,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al responder mensaje: $e');
    }
  }

  Future<void> markAsRead({
    required String tenantId,
    required String sessionId,
  }) async {
    try {
      await _functions.httpsCallable('markPublicChatMessagesAsRead').call({
        'tenantId': tenantId,
        'sessionId': sessionId,
      });
    } catch (e) {
      throw Exception('Error al marcar como leído: $e');
    }
  }
}


