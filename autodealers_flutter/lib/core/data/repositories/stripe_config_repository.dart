// Repositorio de Stripe Config - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class StripeConfigRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener configuración de Stripe (solo admin)
  Future<Map<String, dynamic>> getStripeConfig() async {
    try {
      final result = await _functions.httpsCallable('getStripeConfig').call();
      final data = result.data as Map<String, dynamic>;
      return data['config'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener configuración de Stripe: $e');
    }
  }

  // Actualizar configuración de Stripe (solo admin)
  Future<void> updateStripeConfig(Map<String, dynamic> config) async {
    try {
      await _functions.httpsCallable('updateStripeConfig').call({
        'config': config,
      });
    } catch (e) {
      throw Exception('Error al actualizar configuración de Stripe: $e');
    }
  }

  // Verificar conexión de Stripe (solo admin)
  Future<Map<String, dynamic>> verifyStripeConnection() async {
    try {
      final result = await _functions.httpsCallable('verifyStripeConnection').call();
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al verificar conexión de Stripe: $e');
    }
  }
}


