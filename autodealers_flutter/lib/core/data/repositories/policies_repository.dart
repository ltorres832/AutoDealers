// Repositorio de Policies - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class PoliciesRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  Future<bool> initializePolicies() async {
    try {
      await _functions.httpsCallable('initializePolicies').call();
      return true;
    } catch (e) {
      throw Exception('Error al inicializar políticas: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getPolicies({
    String? type,
    String? language,
    String? applicableTo,
  }) async {
    try {
      final result = await _functions.httpsCallable('getPolicies').call({
        if (type != null) 'type': type,
        if (language != null) 'language': language,
        if (applicableTo != null) 'applicableTo': applicableTo,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['policies'] as List);
    } catch (e) {
      throw Exception('Error al obtener políticas: $e');
    }
  }

  Future<Map<String, dynamic>> createPolicy(Map<String, dynamic> policy) async {
    try {
      final result = await _functions.httpsCallable('createPolicy').call({
        'policy': policy,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear política: $e');
    }
  }

  Future<Map<String, dynamic>> updatePolicy({
    required String policyId,
    required Map<String, dynamic> policy,
  }) async {
    try {
      final result = await _functions.httpsCallable('updatePolicy').call({
        'policyId': policyId,
        'policy': policy,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar política: $e');
    }
  }
}


