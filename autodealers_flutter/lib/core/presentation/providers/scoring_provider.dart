// Provider de Scoring - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/scoring_repository.dart';
import '../../data/services/firestore_service.dart';

class ScoringProvider extends ChangeNotifier {
  final ScoringRepository _repository = ScoringRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _rules = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get rules => _rules;
  Map<String, dynamic>? get scoringConfig => _rules.isNotEmpty ? {'rules': _rules} : null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadScoringConfig();
  }

  Future<void> loadScoringConfig() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _rules = await _repository.getScoringConfig(_tenantId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createRule(Map<String, dynamic> rule) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.createScoringRule(
        tenantId: _tenantId!,
        rule: rule,
      );
      await loadScoringConfig();
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

  Future<bool> updateRule({
    required String ruleId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.updateScoringRule(
        tenantId: _tenantId!,
        ruleId: ruleId,
        updates: updates,
      );
      await loadScoringConfig();
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

  Future<bool> deleteRule(String ruleId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.deleteScoringRule(
        tenantId: _tenantId!,
        ruleId: ruleId,
      );
      await loadScoringConfig();
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

  // Alias para compatibilidad
  Future<bool> deleteScoringRule(String ruleId) => deleteRule(ruleId);
}


