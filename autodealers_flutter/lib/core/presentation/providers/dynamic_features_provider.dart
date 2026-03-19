// Provider de Dynamic Features - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/dynamic_features_repository.dart';
import '../../data/services/firestore_service.dart';

class DynamicFeaturesProvider extends ChangeNotifier {
  final DynamicFeaturesRepository _dynamicFeaturesRepository = DynamicFeaturesRepository();
  final FirestoreService _firestoreService = FirestoreService();

  Map<String, bool> _features = {};
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  Map<String, bool> get features => _features;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadDynamicFeatures();
  }

  // Cargar features dinámicas
  Future<void> loadDynamicFeatures() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_tenantId != null) {
        _dynamicFeaturesRepository.watchDynamicFeatures(tenantId: _tenantId).listen((features) {
          _features = features;
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

  // Verificar si una feature está habilitada
  Future<bool> isFeatureEnabled(String featureKey) async {
    if (_tenantId == null) return false;
    try {
      return await _dynamicFeaturesRepository.checkDynamicFeature(
        tenantId: _tenantId!,
        featureKey: featureKey,
      );
    } catch (e) {
      return false;
    }
  }

  // Actualizar features dinámicas
  Future<bool> updateDynamicFeatures(Map<String, bool> features) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _dynamicFeaturesRepository.updateDynamicFeatures(
        tenantId: _tenantId ?? '',
        features: features,
      );
      _features = features;
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


