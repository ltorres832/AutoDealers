// Provider de Pricing Config - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/pricing_config_repository.dart';

class PricingConfigProvider extends ChangeNotifier {
  final PricingConfigRepository _pricingConfigRepository = PricingConfigRepository();

  Map<String, dynamic>? _config;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get config => _config;
  Map<String, dynamic>? get pricingConfig => _config; // Alias para compatibilidad
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar configuración de precios
  Future<void> loadPricingConfig() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _config = await _pricingConfigRepository.getPricingConfig();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Actualizar configuración de precios
  Future<bool> updatePricingConfig(Map<String, dynamic> config) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _pricingConfigRepository.updatePricingConfig(config);
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


