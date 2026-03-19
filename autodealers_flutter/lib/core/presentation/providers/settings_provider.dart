// Provider de Settings - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/settings_repository.dart';

class SettingsProvider extends ChangeNotifier {
  final SettingsRepository _repository = SettingsRepository();

  Map<String, dynamic>? _settings;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get settings => _settings;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadSettings() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _settings = await _repository.getSettings();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateSettings(Map<String, dynamic> settings) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final success = await _repository.updateSettings(settings);
      if (success) {
        _settings = settings;
      }
      _isLoading = false;
      notifyListeners();
      return success;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}


