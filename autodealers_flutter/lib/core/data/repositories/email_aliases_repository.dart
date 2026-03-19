// Repositorio de Email Aliases - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class EmailAliasesRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  Future<List<Map<String, dynamic>>> getEmailAliases({
    String? dealerId,
    String? assignedTo,
  }) async {
    try {
      final result = await _functions.httpsCallable('getEmailAliases').call({
        if (dealerId != null) 'dealerId': dealerId,
        if (assignedTo != null) 'assignedTo': assignedTo,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['aliases'] as List);
    } catch (e) {
      throw Exception('Error al obtener aliases: $e');
    }
  }

  Future<Map<String, dynamic>> createEmailAlias({
    required String alias,
    required String dealerId,
    String? assignedTo,
    String? forwardTo,
  }) async {
    try {
      final result = await _functions.httpsCallable('createEmailAlias').call({
        'alias': alias,
        'dealerId': dealerId,
        if (assignedTo != null) 'assignedTo': assignedTo,
        if (forwardTo != null) 'forwardTo': forwardTo,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear alias: $e');
    }
  }

  Future<Map<String, dynamic>> updateEmailAlias({
    required String aliasId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final result = await _functions.httpsCallable('updateEmailAlias').call({
        'aliasId': aliasId,
        'updates': updates,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar alias: $e');
    }
  }

  Future<bool> deleteEmailAlias(String aliasId) async {
    try {
      await _functions.httpsCallable('deleteEmailAlias').call({
        'aliasId': aliasId,
      });
      return true;
    } catch (e) {
      throw Exception('Error al eliminar alias: $e');
    }
  }
}


