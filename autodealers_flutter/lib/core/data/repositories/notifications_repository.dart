// Repositorio de Notificaciones - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class NotificationsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener notificaciones del usuario (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchNotifications({
    String? tenantId,
    String? userId,
    bool unreadOnly = false,
    int? limit,
  }) {
    final finalTenantId = tenantId ?? '';
    final finalUserId = userId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('notifications')
        .where('userId', isEqualTo: finalUserId);

    if (unreadOnly) {
      query = query.where('read', isEqualTo: false);
    }

    query = query.orderBy('createdAt', descending: true);

    if (limit != null) {
      query = query.limit(limit);
    }

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'createdAt': data['createdAt']?.toDate(),
            'readAt': data['readAt']?.toDate(),
          };
        })
        .toList());
  }

  // Crear notificación
  Future<bool> createNotification({
    required String tenantId,
    required String userId,
    required String type,
    required String title,
    required String message,
    List<String>? channels,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final result = await _functions.httpsCallable('createNotificationFunction').call({
        'tenantId': tenantId,
        'userId': userId,
        'type': type,
        'title': title,
        'message': message,
        'channels': channels ?? ['system'],
        'metadata': metadata,
      });

      return (result.data as Map<String, dynamic>)['notification'] != null;
    } catch (e) {
      throw Exception('Error al crear notificación: $e');
    }
  }

  // Obtener notificaciones
  Future<List<Map<String, dynamic>>> getNotifications({
    required String tenantId,
    required String userId,
    bool unreadOnly = false,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getUserNotificationsFunction').call({
        'tenantId': tenantId,
        'userId': userId,
        'unreadOnly': unreadOnly,
        'limit': limit,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['notifications'] as List);
    } catch (e) {
      throw Exception('Error al obtener notificaciones: $e');
    }
  }

  // Marcar como leída
  Future<void> markAsRead({
    required String tenantId,
    required String notificationId,
  }) async {
    try {
      await _functions.httpsCallable('markNotificationAsReadFunction').call({
        'tenantId': tenantId,
        'notificationId': notificationId,
      });
    } catch (e) {
      throw Exception('Error al marcar notificación como leída: $e');
    }
  }

  // Marcar todas como leídas
  Future<void> markAllAsRead({
    required String tenantId,
    required String userId,
  }) async {
    try {
      await _functions.httpsCallable('markAllNotificationsAsReadFunction').call({
        'tenantId': tenantId,
        'userId': userId,
      });
    } catch (e) {
      throw Exception('Error al marcar todas las notificaciones como leídas: $e');
    }
  }
}


