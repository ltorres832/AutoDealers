// Provider de Stripe Config - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/stripe_config_repository.dart';

class StripeConfigProvider extends ChangeNotifier {
  final StripeConfigRepository _stripeConfigRepository = StripeConfigRepository();

  Map<String, dynamic>? _config;
  Map<String, dynamic>? _connectionStatus;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get config => _config;
  Map<String, dynamic>? get connectionStatus => _connectionStatus;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar configuración de Stripe
  Future<void> loadStripeConfig() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _config = await _stripeConfigRepository.getStripeConfig();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Actualizar configuración de Stripe
  Future<bool> updateStripeConfig(Map<String, dynamic> config) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _stripeConfigRepository.updateStripeConfig(config);
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

  // Verificar conexión de Stripe
  Future<bool> verifyConnection() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _connectionStatus = await _stripeConfigRepository.verifyStripeConnection();
      _isLoading = false;
      notifyListeners();
      return _connectionStatus?['connected'] == true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}


