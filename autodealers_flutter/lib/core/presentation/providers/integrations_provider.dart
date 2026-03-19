// Provider de Integrations - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/integrations_repository.dart';
import '../../data/services/firestore_service.dart';
import 'dart:async';

class IntegrationsProvider extends ChangeNotifier {
  final IntegrationsRepository _repository = IntegrationsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _integrations = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  StreamSubscription<List<Map<String, dynamic>>>? _integrationsSubscription;

  List<Map<String, dynamic>> get integrations => _integrations;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadIntegrations();
    _setupRealtimeListeners();
  }

  void _setupRealtimeListeners() {
    if (_tenantId == null) return;

    _integrationsSubscription?.cancel();
    _integrationsSubscription = _repository.watchIntegrations(_tenantId!).listen((integrations) {
      _integrations = integrations;
      notifyListeners();
    });
  }

  Future<void> loadIntegrations() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _integrations = await _repository.getIntegrations(_tenantId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> saveCredentials({
    required String type,
    required Map<String, dynamic> credentials,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.saveCredentials(
        tenantId: _tenantId!,
        type: type,
        credentials: credentials,
      );
      await loadIntegrations();
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

  Future<Map<String, dynamic>?> connectIntegration(String type, {Map<String, dynamic>? credentials}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repository.connectIntegration(
        tenantId: _tenantId!,
        type: type,
        credentials: credentials ?? {},
      );
      await loadIntegrations();
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

  Future<bool> disconnectIntegration(String integrationId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.disconnectIntegration(
        tenantId: _tenantId!,
        integrationId: integrationId,
      );
      await loadIntegrations();
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

  @override
  void dispose() {
    _integrationsSubscription?.cancel();
    super.dispose();
  }
}


