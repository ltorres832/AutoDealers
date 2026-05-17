// Repositorio de Subdominios - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class SubdomainRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Crear tenant con subdominio
  Future<Map<String, dynamic>> createTenantWithSubdomain({
    required String name,
    required String type,
    String? subdomain,
    String? membershipId,
    String? companyName,
  }) async {
    try {
      final result = await _functions.httpsCallable('createTenantWithSubdomain').call({
        'name': name,
        'type': type,
        'subdomain': subdomain,
        'membershipId': membershipId,
        'companyName': companyName,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear tenant con subdominio: $e');
    }
  }

  // Actualizar subdominio
  Future<void> updateTenantSubdomain({
    required String tenantId,
    required String subdomain,
  }) async {
    try {
      await _functions.httpsCallable('updateTenantSubdomain').call({
        'tenantId': tenantId,
        'subdomain': subdomain,
      });
    } catch (e) {
      throw Exception('Error al actualizar subdominio: $e');
    }
  }

  // Validar disponibilidad de subdominio
  Future<bool> validateSubdomain({
    required String subdomain,
    String? excludeTenantId,
  }) async {
    try {
      final result = await _functions.httpsCallable('validateSubdomain').call({
        'subdomain': subdomain,
        'excludeTenantId': excludeTenantId,
      });

      return (result.data as Map<String, dynamic>)['available'] as bool;
    } catch (e) {
      throw Exception('Error al validar subdominio: $e');
    }
  }

  // Obtener tenant por subdominio
  Future<Map<String, dynamic>?> getTenantBySubdomain(String subdomain) async {
    try {
      final result = await _functions.httpsCallable('getTenantBySubdomain').call({
        'subdomain': subdomain,
      });

      final data = result.data as Map<String, dynamic>;
      return data['tenant'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener tenant por subdominio: $e');
    }
  }
}


