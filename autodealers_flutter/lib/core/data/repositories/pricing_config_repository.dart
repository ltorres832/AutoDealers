// Repositorio de Pricing Config - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class PricingConfigRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener configuración de precios
  Future<Map<String, dynamic>> getPricingConfig() async {
    try {
      final result = await _functions.httpsCallable('getPricingConfig').call();
      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración de precios: $e');
    }
  }

  // Actualizar configuración de precios (solo admin)
  Future<void> updatePricingConfig(Map<String, dynamic> config) async {
    try {
      await _functions.httpsCallable('updatePricingConfig').call({
        'config': config,
      });
    } catch (e) {
      throw Exception('Error al actualizar configuración de precios: $e');
    }
  }
}


