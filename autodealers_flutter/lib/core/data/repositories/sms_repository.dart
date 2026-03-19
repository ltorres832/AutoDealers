// Repositorio de SMS - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class SMSRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Enviar SMS
  Future<bool> sendSMS({
    required String tenantId,
    required String to,
    required String content,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendSMS').call({
        'tenantId': tenantId,
        'to': to,
        'content': content,
      });

      return (result.data as Map<String, dynamic>)['success'] as bool;
    } catch (e) {
      throw Exception('Error al enviar SMS: $e');
    }
  }

  // Enviar SMS en bulk
  Future<Map<String, dynamic>> sendBulkSMS({
    required String tenantId,
    required List<String> recipients,
    required String content,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendBulkSMS').call({
        'tenantId': tenantId,
        'recipients': recipients,
        'content': content,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al enviar SMS en bulk: $e');
    }
  }

  // Enviar notificación SMS
  Future<bool> sendSMSNotification({
    required String tenantId,
    required String userId,
    required String title,
    required String message,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendSMSNotification').call({
        'tenantId': tenantId,
        'userId': userId,
        'title': title,
        'message': message,
      });

      return (result.data as Map<String, dynamic>)['success'] as bool;
    } catch (e) {
      throw Exception('Error al enviar notificación SMS: $e');
    }
  }
}


