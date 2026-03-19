// Provider de Landing Config - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/landing_config_repository.dart';
import '../../data/services/firestore_service.dart';

class LandingConfigProvider extends ChangeNotifier {
  final LandingConfigRepository _landingConfigRepository = LandingConfigRepository();
  final FirestoreService _firestoreService = FirestoreService();

  Map<String, dynamic>? _config;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  Map<String, dynamic>? get config => _config;
  Map<String, dynamic>? get landingConfig => _config; // Alias para compatibilidad
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadLandingConfig();
  }

  // Cargar configuración de landing
  Future<void> loadLandingConfig() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_tenantId != null) {
        _landingConfigRepository.watchLandingConfig(tenantId: _tenantId).listen((config) {
          _config = config;
          _isLoading = false;
          notifyListeners();
        });
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar configuración pública de landing
  Future<void> loadPublicLandingConfig(String tenantId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _config = await _landingConfigRepository.getPublicLandingConfig(tenantId: tenantId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Actualizar configuración de landing
  Future<bool> updateLandingConfig(Map<String, dynamic> config) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _landingConfigRepository.updateLandingConfig(
        tenantId: _tenantId ?? '',
        config: config,
      );
      _config = config;
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
}


