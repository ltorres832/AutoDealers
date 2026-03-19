// Repositorio de WhatsApp - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class WhatsAppRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Enviar mensaje WhatsApp
  Future<bool> sendWhatsAppMessage({
    required String tenantId,
    required String to,
    required String content,
    String? leadId,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendWhatsAppMessage').call({
        'tenantId': tenantId,
        'to': to,
        'content': content,
        'leadId': leadId,
      });

      return (result.data as Map<String, dynamic>)['success'] as bool;
    } catch (e) {
      throw Exception('Error al enviar mensaje WhatsApp: $e');
    }
  }

  // Enviar notificación WhatsApp
  Future<bool> sendWhatsAppNotification({
    required String tenantId,
    required String userId,
    required String title,
    required String message,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendWhatsAppNotification').call({
        'tenantId': tenantId,
        'userId': userId,
        'title': title,
        'message': message,
      });

      return (result.data as Map<String, dynamic>)['success'] as bool;
    } catch (e) {
      throw Exception('Error al enviar notificación WhatsApp: $e');
    }
  }
}


