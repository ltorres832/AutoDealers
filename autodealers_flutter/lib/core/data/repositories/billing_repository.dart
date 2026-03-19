// Repositorio de Billing - Data Layer COMPLETO
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class BillingRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Crear suscripción
  Future<Map<String, dynamic>> createSubscription({
    required String tenantId,
    required String userId,
    required String membershipId,
    required String customerEmail,
    required String customerName,
    required String priceId,
  }) async {
    try {
      final result = await _functions.httpsCallable('createSubscription').call({
        'tenantId': tenantId,
        'userId': userId,
        'membershipId': membershipId,
        'customerEmail': customerEmail,
        'customerName': customerName,
        'priceId': priceId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['subscription'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear suscripción: $e');
    }
  }

  // Obtener suscripción
  Future<Map<String, dynamic>?> getSubscription(String subscriptionId) async {
    try {
      final result = await _functions.httpsCallable('getSubscription').call({
        'subscriptionId': subscriptionId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['subscription'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener suscripción: $e');
    }
  }

  // Obtener todas las suscripciones
  Future<List<Map<String, dynamic>>> getAllSubscriptions({
    String? status,
    String? tenantId,
    String? membershipId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getAllSubscriptionsFunction').call({
        'status': status,
        'tenantId': tenantId,
        'membershipId': membershipId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['subscriptions'] as List);
    } catch (e) {
      throw Exception('Error al obtener suscripciones: $e');
    }
  }

  // Actualizar suscripción
  Future<void> updateSubscription({
    required String subscriptionId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateSubscription').call({
        'subscriptionId': subscriptionId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar suscripción: $e');
    }
  }

  // Cancelar suscripción
  Future<void> cancelSubscription({
    required String subscriptionId,
    bool cancelAtPeriodEnd = true,
  }) async {
    try {
      await _functions.httpsCallable('cancelSubscription').call({
        'subscriptionId': subscriptionId,
        'cancelAtPeriodEnd': cancelAtPeriodEnd,
      });
    } catch (e) {
      throw Exception('Error al cancelar suscripción: $e');
    }
  }

  // Reactivar suscripción
  Future<void> reactivateSubscription(String subscriptionId) async {
    try {
      await _functions.httpsCallable('reactivateSubscription').call({
        'subscriptionId': subscriptionId,
      });
    } catch (e) {
      throw Exception('Error al reactivar suscripción: $e');
    }
  }

  // Cambiar membresía (upgrade/downgrade)
  Future<void> changeMembership({
    required String subscriptionId,
    required String newMembershipId,
    required String newPriceId,
  }) async {
    try {
      await _functions.httpsCallable('changeMembership').call({
        'subscriptionId': subscriptionId,
        'newMembershipId': newMembershipId,
        'newPriceId': newPriceId,
      });
    } catch (e) {
      throw Exception('Error al cambiar membresía: $e');
    }
  }

  // Obtener membresías disponibles
  Future<List<Map<String, dynamic>>> getAvailableMemberships({String? type}) async {
    try {
      final result = await _functions.httpsCallable('getAvailableMemberships').call({
        'type': type,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['memberships'] as List);
    } catch (e) {
      throw Exception('Error al obtener membresías: $e');
    }
  }

  // Obtener membresía por ID
  Future<Map<String, dynamic>?> getMembershipById(String membershipId) async {
    try {
      final result = await _functions.httpsCallable('getMembershipById').call({
        'membershipId': membershipId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['membership'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener membresía: $e');
    }
  }

  // Actualizar membresía (admin) - requiere Cloud Function updateMembership
  Future<Map<String, dynamic>> updateMembership(String membershipId, Map<String, dynamic> updates) async {
    try {
      final result = await _functions.httpsCallable('updateMembership').call({
        'membershipId': membershipId,
        'updates': updates,
      });
      final data = result.data as Map<String, dynamic>?;
      if (data == null) throw Exception('Sin respuesta');
      final membership = data['membership'];
      if (membership is Map<String, dynamic>) return membership;
      return data;
    } catch (e) {
      throw Exception('Error al actualizar membresía: $e');
    }
  }

  // Crear payment intent
  Future<Map<String, dynamic>> createPaymentIntent({
    required String tenantId,
    required int amount,
    required String currency,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final result = await _functions.httpsCallable('createPaymentIntent').call({
        'tenantId': tenantId,
        'amount': amount,
        'currency': currency,
        'metadata': metadata,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear payment intent: $e');
    }
  }

  // Crear setup intent (para guardar método de pago)
  Future<Map<String, dynamic>> createSetupIntent({
    required String tenantId,
    String? customerId,
  }) async {
    try {
      final result = await _functions.httpsCallable('createSetupIntent').call({
        'tenantId': tenantId,
        'customerId': customerId,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear setup intent: $e');
    }
  }

  // Obtener métodos de pago
  Future<List<Map<String, dynamic>>> getPaymentMethods(String customerId) async {
    try {
      final result = await _functions.httpsCallable('getPaymentMethods').call({
        'customerId': customerId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['paymentMethods'] as List);
    } catch (e) {
      throw Exception('Error al obtener métodos de pago: $e');
    }
  }

  // Establecer método de pago por defecto
  Future<void> setDefaultPaymentMethod({
    required String customerId,
    required String paymentMethodId,
  }) async {
    try {
      await _functions.httpsCallable('setDefaultPaymentMethod').call({
        'customerId': customerId,
        'paymentMethodId': paymentMethodId,
      });
    } catch (e) {
      throw Exception('Error al establecer método de pago por defecto: $e');
    }
  }

  // Desvincular método de pago
  Future<void> detachPaymentMethod(String paymentMethodId) async {
    try {
      await _functions.httpsCallable('detachPaymentMethod').call({
        'paymentMethodId': paymentMethodId,
      });
    } catch (e) {
      throw Exception('Error al desvincular método de pago: $e');
    }
  }

  // Obtener facturas
  Future<List<Map<String, dynamic>>> getInvoices({
    required String customerId,
    int limit = 10,
  }) async {
    try {
      final result = await _functions.httpsCallable('getInvoices').call({
        'customerId': customerId,
        'limit': limit,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['invoices'] as List);
    } catch (e) {
      throw Exception('Error al obtener facturas: $e');
    }
  }

  // Obtener suscripción del tenant/usuario
  Future<Map<String, dynamic>?> getTenantSubscription({
    required String tenantId,
    String? userId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getTenantSubscription').call({
        'tenantId': tenantId,
        'userId': userId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['subscription'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener suscripción del tenant: $e');
    }
  }
}


