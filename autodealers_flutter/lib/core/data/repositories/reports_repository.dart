// Repositorio de Reportes - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class ReportsRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Generar reporte de leads
  Future<Map<String, dynamic>> getLeadsReport({
    required String tenantId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getLeadsReport').call({
        'tenantId': tenantId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return data['report'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar reporte de leads: $e');
    }
  }

  // Generar reporte de ventas
  Future<Map<String, dynamic>> getSalesReport({
    required String tenantId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getSalesReport').call({
        'tenantId': tenantId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return data['report'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar reporte de ventas: $e');
    }
  }

  // Generar reporte de rendimiento
  Future<Map<String, dynamic>> getPerformanceReport({
    required String tenantId,
    required String sellerId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getPerformanceReport').call({
        'tenantId': tenantId,
        'sellerId': sellerId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return data['report'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar reporte de rendimiento: $e');
    }
  }

  // Generar reporte de redes sociales
  Future<List<Map<String, dynamic>>> getSocialMediaReport({
    required String tenantId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getSocialMediaReport').call({
        'tenantId': tenantId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['reports'] as List);
    } catch (e) {
      throw Exception('Error al generar reporte de redes sociales: $e');
    }
  }

  // Generar reporte de IA
  Future<Map<String, dynamic>> getAIReport({
    required String tenantId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getAIReport').call({
        'tenantId': tenantId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return data['report'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar reporte de IA: $e');
    }
  }
}


