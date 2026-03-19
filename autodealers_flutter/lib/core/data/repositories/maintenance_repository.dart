// Repositorio de Maintenance - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class MaintenanceRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener estado de mantenimiento (stream en tiempo real)
  Stream<Map<String, dynamic>> watchMaintenanceStatus() {
    return _firestore
        .collection('admin_config')
        .doc('maintenance')
        .snapshots()
        .map((doc) {
      if (!doc.exists) {
        return {
          'enabled': false,
          'message': '',
          'scheduledStart': null,
          'scheduledEnd': null,
        };
      }
      final data = doc.data() ?? {};
      return {
        'enabled': data['enabled'] ?? false,
        'message': data['message'] ?? '',
        'scheduledStart': data['scheduledStart']?.toDate(),
        'scheduledEnd': data['scheduledEnd']?.toDate(),
        'allowedIPs': List<String>.from(data['allowedIPs'] ?? []),
        'allowedUsers': List<String>.from(data['allowedUsers'] ?? []),
      };
    });
  }

  // Obtener estado de mantenimiento
  Future<Map<String, dynamic>> getMaintenanceStatus() async {
    try {
      final result = await _functions.httpsCallable('getMaintenanceStatus').call();
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener estado de mantenimiento: $e');
    }
  }

  // Verificar si el sistema está en mantenimiento (público)
  Future<Map<String, dynamic>> checkMaintenanceMode() async {
    try {
      final result = await _functions.httpsCallable('checkMaintenanceMode').call();
      return result.data as Map<String, dynamic>;
    } catch (e) {
      // En caso de error, no bloquear el acceso
      return {'inMaintenance': false};
    }
  }

  // Activar/Desactivar modo de mantenimiento (solo admin)
  Future<void> setMaintenanceMode({
    required bool enabled,
    String? message,
    DateTime? scheduledStart,
    DateTime? scheduledEnd,
    List<String>? allowedIPs,
    List<String>? allowedUsers,
  }) async {
    try {
      await _functions.httpsCallable('setMaintenanceMode').call({
        'enabled': enabled,
        'message': message,
        'scheduledStart': scheduledStart?.toIso8601String(),
        'scheduledEnd': scheduledEnd?.toIso8601String(),
        'allowedIPs': allowedIPs,
        'allowedUsers': allowedUsers,
      });
    } catch (e) {
      throw Exception('Error al configurar modo de mantenimiento: $e');
    }
  }
}


