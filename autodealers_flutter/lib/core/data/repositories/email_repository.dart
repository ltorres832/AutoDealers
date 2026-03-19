// Repositorio de Emails - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class EmailRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Enviar email
  Future<bool> sendEmail({
    required String tenantId,
    required String to,
    required String subject,
    required String content,
    String? from,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendEmail').call({
        'tenantId': tenantId,
        'to': to,
        'subject': subject,
        'content': content,
        'from': from,
        'metadata': metadata,
      });

      return (result.data as Map<String, dynamic>)['success'] as bool;
    } catch (e) {
      throw Exception('Error al enviar email: $e');
    }
  }

  // Enviar email con template
  Future<bool> sendEmailTemplate({
    required String tenantId,
    required String to,
    required String templateId,
    Map<String, dynamic>? variables,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendEmailTemplate').call({
        'tenantId': tenantId,
        'to': to,
        'templateId': templateId,
        'variables': variables,
      });

      return (result.data as Map<String, dynamic>)['success'] as bool;
    } catch (e) {
      throw Exception('Error al enviar email con template: $e');
    }
  }

  // Enviar emails en bulk
  Future<Map<String, dynamic>> sendBulkEmail({
    required String tenantId,
    required List<String> recipients,
    required String subject,
    required String content,
    String? from,
  }) async {
    try {
      final result = await _functions.httpsCallable('sendBulkEmail').call({
        'tenantId': tenantId,
        'recipients': recipients,
        'subject': subject,
        'content': content,
        'from': from,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al enviar emails en bulk: $e');
    }
  }
}


