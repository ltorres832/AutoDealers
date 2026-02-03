import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/user_role.dart';

/// Modelo de Mensaje
class Message {
  final String id;
  final String tenantId;
  final String channel; // whatsapp, email, sms, etc.
  final String? leadId;
  final String? sellerId;
  final String direction; // inbound, outbound
  final String content;
  final String status;
  final DateTime createdAt;

  Message({
    required this.id,
    required this.tenantId,
    required this.channel,
    this.leadId,
    this.sellerId,
    required this.direction,
    required this.content,
    required this.status,
    required this.createdAt,
  });

  factory Message.fromFirestore(Map<String, dynamic> data, String id) {
    return Message(
      id: id,
      tenantId: data['tenantId'] ?? '',
      channel: data['channel'] ?? '',
      leadId: data['leadId'],
      sellerId: data['sellerId'],
      direction: data['direction'] ?? 'inbound',
      content: data['content'] ?? '',
      status: data['status'] ?? 'sent',
      createdAt: _parseTimestamp(data['createdAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'tenantId': tenantId,
      'channel': channel,
      'leadId': leadId,
      'sellerId': sellerId,
      'direction': direction,
      'content': content,
      'status': status,
    };
  }

  static DateTime _parseTimestamp(dynamic timestamp) {
    if (timestamp == null) return DateTime.now();
    if (timestamp is DateTime) return timestamp;
    if (timestamp is Timestamp) return timestamp.toDate();
    if (timestamp is String) return DateTime.parse(timestamp);
    return DateTime.now();
  }
}

/// Servicio para gestión de Mensajería
class MessagingService {
  final FirestoreService _firestore = FirestoreService();
  final AuthService _auth = AuthService();

  /// Obtiene mensajes con sincronización en tiempo real
  Stream<List<Message>> watchMessages({
    String? channel,
    String? leadId,
  }) async* {
    final permissions = await _auth.getPermissions();
    if (permissions == null) return;

    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) return;

    Query query = FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('messages');

    if (channel != null) {
      query = query.where('channel', isEqualTo: channel);
    }

    if (leadId != null) {
      query = query.where('leadId', isEqualTo: leadId);
    }

    if (permissions.role == UserRole.seller) {
      final user = _auth.currentUser;
      if (user != null) {
        query = query.where('sellerId', isEqualTo: user.uid);
      }
    }

    query = query.orderBy('createdAt', descending: true).limit(50);

    await for (final snapshot in query.snapshots()) {
      yield snapshot.docs.map((doc) {
        return Message.fromFirestore(doc.data(), doc.id);
      }).toList();
    }
  }

  /// Envía un mensaje
  Future<String> sendMessage({
    required String channel,
    required String content,
    String? leadId,
    String? sellerId,
  }) async {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    final permissions = await _auth.getPermissions();
    final currentUserId = _auth.currentUser?.uid;

    return await _firestore.create(
      collection: 'messages',
      data: {
        'tenantId': tenantId,
        'channel': channel,
        'leadId': leadId,
        'sellerId': sellerId ?? (permissions?.role == UserRole.seller ? currentUserId : null),
        'direction': 'outbound',
        'content': content,
        'status': 'sent',
      },
    );
  }
}


