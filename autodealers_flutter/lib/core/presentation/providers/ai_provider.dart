// Provider de IA - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/ai_repository.dart';
import '../../data/services/firestore_service.dart';

class AIProvider extends ChangeNotifier {
  final AIRepository _aiRepository = AIRepository();
  final FirestoreService _firestoreService = FirestoreService();

  Map<String, dynamic>? _lastClassification;
  Map<String, dynamic>? _lastResponse;
  Map<String, dynamic>? _lastContent;
  Map<String, dynamic>? _lastAnalysis;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  Map<String, dynamic>? get lastClassification => _lastClassification;
  Map<String, dynamic>? get lastResponse => _lastResponse;
  Map<String, dynamic>? get lastContent => _lastContent;
  Map<String, dynamic>? get lastAnalysis => _lastAnalysis;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
  }

  // Clasificar lead
  Future<bool> classifyLead({
    required String leadId,
    required String message,
  }) async {
    if (_tenantId == null) return false;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _lastClassification = await _aiRepository.classifyLead(
        tenantId: _tenantId!,
        leadId: leadId,
        message: message,
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

  // Generar respuesta automática
  Future<String?> generateResponse({
    required String leadId,
    required String context,
  }) async {
    if (_tenantId == null) return null;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _lastResponse = await _aiRepository.generateResponse(
        tenantId: _tenantId!,
        leadId: leadId,
        context: context,
      );
      _isLoading = false;
      notifyListeners();
      return _lastResponse?['content'] as String?;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Generar contenido
  Future<String?> generateContent({
    required String type,
    required String prompt,
  }) async {
    if (_tenantId == null) return null;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _lastContent = await _aiRepository.generateContent(
        tenantId: _tenantId!,
        type: type,
        prompt: prompt,
      );
      _isLoading = false;
      notifyListeners();
      return _lastContent?['content'] as String?;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Analizar conversación (usando analyzeSentiment)
  Future<Map<String, dynamic>?> analyzeConversation(List<String> messages) async {
    if (_tenantId == null || messages.isEmpty) return null;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final combinedText = messages.join(' ');
      _lastAnalysis = await _aiRepository.analyzeSentiment(
        tenantId: _tenantId!,
        text: combinedText,
      );
      _isLoading = false;
      notifyListeners();
      return _lastAnalysis;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Sugerir vehículos (no implementado en repositorio, retornar lista vacía)
  Future<List<Map<String, dynamic>>> suggestVehicles({
    required Map<String, dynamic> leadInfo,
    required List<Map<String, dynamic>> availableVehicles,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // TODO: Implementar en Cloud Function
      _isLoading = false;
      notifyListeners();
      return [];
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return [];
    }
  }

  // Optimizar precio (no implementado en repositorio, retornar null)
  Future<Map<String, dynamic>?> optimizePrice({
    required String vehicleId,
    required Map<String, dynamic> marketData,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // TODO: Implementar en Cloud Function
      _isLoading = false;
      notifyListeners();
      return null;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }
}


