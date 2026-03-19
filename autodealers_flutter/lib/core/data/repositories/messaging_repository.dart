// Repositorio de Mensajería - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/message.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';
import 'email_repository.dart';
import 'sms_repository.dart';
import 'whatsapp_repository.dart';

class MessagingRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirestoreService _firestoreService = FirestoreService();
  final EmailRepository _emailRepository = EmailRepository();
  final SMSRepository _smsRepository = SMSRepository();
  final WhatsAppRepository _whatsappRepository = WhatsAppRepository();

  // Obtener tenantId actual (helper)
  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener mensajes del tenant
  Stream<List<Message>> watchMessages({
    String? tenantId,
    String? leadId,
    MessageChannel? channel,
    int? limit,
  }) {
    Query query = _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('messages');

    if (leadId != null) {
      query = query.where('leadId', isEqualTo: leadId);
    }
    if (channel != null) {
      query = query.where('channel', isEqualTo: channel.name);
    }

    query = query.orderBy('createdAt', descending: true);

    if (limit != null) {
      query = query.limit(limit);
    }

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) => Message.fromJson({
              'id': doc.id,
              ...doc.data() as Map<String, dynamic>,
            }))
        .toList());
  }

  // Enviar un mensaje
  Future<String> sendMessage(Message message, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    final docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('messages')
        .doc();

    final data = message.toJson();
    data.remove('id');

    await docRef.set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  // Actualizar estado de un mensaje
  Future<void> updateMessageStatus(
    String messageId,
    MessageStatus status, {
    String? tenantId,
  }) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('messages')
        .doc(messageId)
        .update({
      'status': status.name,
    });
  }

  // Eliminar un mensaje
  Future<void> deleteMessage(String messageId, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('messages')
        .doc(messageId)
        .delete();
  }

  // Enviar mensaje por email
  Future<bool> sendEmailMessage({
    required String tenantId,
    required String to,
    required String subject,
    required String content,
    String? from,
  }) async {
    return await _emailRepository.sendEmail(
      tenantId: tenantId,
      to: to,
      subject: subject,
      content: content,
      from: from,
    );
  }

  // Enviar mensaje por SMS
  Future<bool> sendSMSMessage({
    required String tenantId,
    required String to,
    required String content,
  }) async {
    return await _smsRepository.sendSMS(
      tenantId: tenantId,
      to: to,
      content: content,
    );
  }

  // Enviar mensaje por WhatsApp
  Future<bool> sendWhatsAppMessage({
    required String tenantId,
    required String to,
    required String content,
    String? leadId,
  }) async {
    return await _whatsappRepository.sendWhatsAppMessage(
      tenantId: tenantId,
      to: to,
      content: content,
      leadId: leadId,
    );
  }
}


