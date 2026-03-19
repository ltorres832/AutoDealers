// Provider de Auto-Responses - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/auto_responses_repository.dart';
import '../../data/services/firestore_service.dart';

class AutoResponsesProvider extends ChangeNotifier {
  final AutoResponsesRepository _autoResponsesRepository = AutoResponsesRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _responses = [];
  Map<String, dynamic>? _selectedResponse;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get responses => _responses;
  Map<String, dynamic>? get selectedResponse => _selectedResponse;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadAutoResponses();
  }

  // Cargar respuestas automáticas
  Future<void> loadAutoResponses({bool activeOnly = true}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_tenantId != null) {
        _autoResponsesRepository.watchAutoResponses(
          tenantId: _tenantId,
          activeOnly: activeOnly,
        ).listen((responses) {
          _responses = responses;
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

  // Seleccionar respuesta
  void selectResponse(Map<String, dynamic> response) {
    _selectedResponse = response;
    notifyListeners();
  }

  // Crear respuesta automática
  Future<bool> createAutoResponse(Map<String, dynamic> response) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _autoResponsesRepository.createAutoResponse(
        tenantId: _tenantId ?? '',
        response: response,
      );
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

  // Actualizar respuesta automática
  Future<bool> updateAutoResponse(String responseId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _autoResponsesRepository.updateAutoResponse(
        tenantId: _tenantId ?? '',
        responseId: responseId,
        updates: updates,
      );
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

  // Eliminar respuesta automática
  Future<bool> deleteAutoResponse(String responseId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _autoResponsesRepository.deleteAutoResponse(
        tenantId: _tenantId ?? '',
        responseId: responseId,
      );
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


