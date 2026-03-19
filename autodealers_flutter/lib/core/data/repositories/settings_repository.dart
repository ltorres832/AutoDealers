// Repositorio de Settings - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class SettingsRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  Future<Map<String, dynamic>> getSettings() async {
    try {
      final result = await _functions.httpsCallable('getSettings').call();
      final data = result.data as Map<String, dynamic>;
      return data['settings'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración: $e');
    }
  }

  Future<bool> updateSettings(Map<String, dynamic> settings) async {
    try {
      await _functions.httpsCallable('updateSettings').call({
        'settings': settings,
      });
      return true;
    } catch (e) {
      throw Exception('Error al actualizar configuración: $e');
    }
  }
}


