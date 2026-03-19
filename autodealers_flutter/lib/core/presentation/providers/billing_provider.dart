// Provider de Billing - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/billing_repository.dart';
import '../../data/services/firestore_service.dart';

class BillingProvider extends ChangeNotifier {
  final BillingRepository _billingRepository = BillingRepository();
  final FirestoreService _firestoreService = FirestoreService();

  Map<String, dynamic>? _currentSubscription;
  Map<String, dynamic>? _selectedMembership;
  List<Map<String, dynamic>> _memberships = [];
  List<Map<String, dynamic>> _paymentMethods = [];
  List<Map<String, dynamic>> _invoices = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  Map<String, dynamic>? get currentSubscription => _currentSubscription;
  Map<String, dynamic>? get selectedMembership => _selectedMembership;
  List<Map<String, dynamic>> get memberships => _memberships;
  List<Map<String, dynamic>> get paymentMethods => _paymentMethods;
  List<Map<String, dynamic>> get invoices => _invoices;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadTenantSubscription();
    await loadMemberships();
  }

  // Cargar suscripción del tenant
  Future<void> loadTenantSubscription({String? userId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentSubscription = await _billingRepository.getTenantSubscription(
        tenantId: _tenantId!,
        userId: userId,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar membresías disponibles
  Future<void> loadMemberships({String? type}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _memberships = await _billingRepository.getAvailableMemberships(type: type);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar una membresía por ID (admin)
  Future<void> loadMembershipById(String membershipId) async {
    _isLoading = true;
    _error = null;
    _selectedMembership = null;
    notifyListeners();

    try {
      _selectedMembership = await _billingRepository.getMembershipById(membershipId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Actualizar membresía (admin)
  Future<bool> updateMembership(String membershipId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final updated = await _billingRepository.updateMembership(membershipId, updates);
      _selectedMembership = updated;
      await loadMemberships();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Crear suscripción
  Future<bool> createSubscription({
    required String userId,
    required String membershipId,
    required String customerEmail,
    required String customerName,
    required String priceId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final subscription = await _billingRepository.createSubscription(
        tenantId: _tenantId!,
        userId: userId,
        membershipId: membershipId,
        customerEmail: customerEmail,
        customerName: customerName,
        priceId: priceId,
      );

      _currentSubscription = subscription;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Cancelar suscripción
  Future<bool> cancelSubscription({
    required String subscriptionId,
    bool cancelAtPeriodEnd = true,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _billingRepository.cancelSubscription(
        subscriptionId: subscriptionId,
        cancelAtPeriodEnd: cancelAtPeriodEnd,
      );
      await loadTenantSubscription();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Reactivar suscripción
  Future<bool> reactivateSubscription(String subscriptionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _billingRepository.reactivateSubscription(subscriptionId);
      await loadTenantSubscription();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Cambiar membresía
  Future<bool> changeMembership({
    required String subscriptionId,
    required String newMembershipId,
    required String newPriceId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _billingRepository.changeMembership(
        subscriptionId: subscriptionId,
        newMembershipId: newMembershipId,
        newPriceId: newPriceId,
      );
      await loadTenantSubscription();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Cargar métodos de pago
  Future<void> loadPaymentMethods(String customerId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _paymentMethods = await _billingRepository.getPaymentMethods(customerId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Establecer método de pago por defecto
  Future<bool> setDefaultPaymentMethod({
    required String customerId,
    required String paymentMethodId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _billingRepository.setDefaultPaymentMethod(
        customerId: customerId,
        paymentMethodId: paymentMethodId,
      );
      await loadPaymentMethods(customerId);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Desvincular método de pago
  Future<bool> detachPaymentMethod(String paymentMethodId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _billingRepository.detachPaymentMethod(paymentMethodId);
      if (_currentSubscription!['stripeCustomerId'] != null) {
        await loadPaymentMethods(_currentSubscription!['stripeCustomerId']);
      }
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Cargar facturas
  Future<void> loadInvoices(String customerId, {int limit = 10}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _invoices = await _billingRepository.getInvoices(
        customerId: customerId,
        limit: limit,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear payment intent
  Future<Map<String, dynamic>?> createPaymentIntent({
    required int amount,
    required String currency,
    Map<String, dynamic>? metadata,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _billingRepository.createPaymentIntent(
        tenantId: _tenantId!,
        amount: amount,
        currency: currency,
        metadata: metadata,
      );
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Crear setup intent
  Future<Map<String, dynamic>?> createSetupIntent({String? customerId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _billingRepository.createSetupIntent(
        tenantId: _tenantId!,
        customerId: customerId,
      );
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }
}


