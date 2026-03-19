// Provider de Feature Flags - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/feature_flags_repository.dart';

class FeatureFlagsProvider extends ChangeNotifier {
  final FeatureFlagsRepository _featureFlagsRepository = FeatureFlagsRepository();

  Map<String, bool> _featureFlags = {};
  bool _isLoading = false;
  String? _error;
  String? _currentDashboard = '';

  Map<String, bool> get featureFlags => _featureFlags;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar feature flags de un dashboard
  Future<void> loadFeatureFlags(String dashboard) async {
    _isLoading = true;
    _error = null;
    _currentDashboard = dashboard;
    notifyListeners();

    try {
      final features = await _featureFlagsRepository.getFeatureFlags(dashboard);
      _featureFlags = {
        for (var feature in features)
          feature['featureKey'] as String: feature['enabled'] as bool? ?? false
      };
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Verificar si una feature está habilitada
  Future<bool> isFeatureEnabled({
    required String dashboard,
    required String featureKey,
  }) async {
    try {
      return await _featureFlagsRepository.checkFeatureFlag(
        dashboard: dashboard,
        featureKey: featureKey,
      );
    } catch (e) {
      return false;
    }
  }

  // Actualizar feature flag
  Future<bool> updateFeatureFlag(
    String featureKey, {
    required bool enabled,
    String? dashboard,
    String? featureName,
    String? description,
    String? category,
  }) async {
    final dashboardToUse = dashboard ?? _currentDashboard ?? 'admin';
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _featureFlagsRepository.updateFeatureFlag(
        dashboard: dashboardToUse,
        featureKey: featureKey,
        enabled: enabled,
        featureName: featureName,
        description: description,
        category: category,
      );
      _featureFlags[featureKey] = enabled;
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


