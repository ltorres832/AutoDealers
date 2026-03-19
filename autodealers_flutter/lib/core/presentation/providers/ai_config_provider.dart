// Provider de AI Config - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/ai_config_repository.dart';

class AIConfigProvider extends ChangeNotifier {
  final AIConfigRepository _aiConfigRepository = AIConfigRepository();

  Map<String, dynamic>? _globalConfig;
  Map<String, dynamic>? _tenantConfig;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get globalConfig => _globalConfig;
  Map<String, dynamic>? get tenantConfig => _tenantConfig;
  Map<String, dynamic>? get aiConfig => _globalConfig; // Alias para compatibilidad (usa globalConfig)
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar configuración global de IA
  Future<void> loadAIConfig() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _globalConfig = await _aiConfigRepository.getAIConfig();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar configuración de IA para un tenant
  Future<void> loadTenantAIConfig(String tenantId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _tenantConfig = await _aiConfigRepository.getTenantAIConfig(tenantId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Actualizar configuración global de IA
  Future<bool> updateAIConfig(Map<String, dynamic> config) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _aiConfigRepository.updateAIConfig(config);
      _globalConfig = config;
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

  // Actualizar configuración de IA para un tenant
  Future<bool> updateTenantAIConfig(String tenantId, Map<String, dynamic> config) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _aiConfigRepository.updateTenantAIConfig(
        tenantId: tenantId,
        config: config,
      );
      _tenantConfig = config;
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


