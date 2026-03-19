// Repositorio de Pre-Qualifications - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class PreQualificationsRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  Future<List<Map<String, dynamic>>> getPreQualifications({
    required String tenantId,
    String? status,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getPreQualifications').call({
        'tenantId': tenantId,
        if (status != null) 'status': status,
        if (limit != null) 'limit': limit,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['preQualifications'] as List);
    } catch (e) {
      throw Exception('Error al obtener pre-cualificaciones: $e');
    }
  }

  Future<Map<String, dynamic>> createPreQualification({
    required String tenantId,
    required Map<String, dynamic> clientInfo,
    Map<String, dynamic>? vehicleInfo,
    Map<String, dynamic>? financialInfo,
    String? status,
  }) async {
    try {
      final result = await _functions.httpsCallable('createPreQualification').call({
        'tenantId': tenantId,
        'clientInfo': clientInfo,
        if (vehicleInfo != null) 'vehicleInfo': vehicleInfo,
        if (financialInfo != null) 'financialInfo': financialInfo,
        if (status != null) 'status': status,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear pre-cualificación: $e');
    }
  }

  Future<Map<String, dynamic>> updatePreQualification({
    required String tenantId,
    required String preQualificationId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final result = await _functions.httpsCallable('updatePreQualification').call({
        'tenantId': tenantId,
        'preQualificationId': preQualificationId,
        'updates': updates,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar pre-cualificación: $e');
    }
  }
}


