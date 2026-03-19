// Provider de Policies - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/policies_repository.dart';

class PoliciesProvider extends ChangeNotifier {
  final PoliciesRepository _repository = PoliciesRepository();

  List<Map<String, dynamic>> _policies = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get policies => _policies;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<bool> initializePolicies() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.initializePolicies();
      await loadPolicies();
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

  Future<void> loadPolicies({
    String? type,
    String? language,
    String? applicableTo,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _policies = await _repository.getPolicies(
        type: type,
        language: language,
        applicableTo: applicableTo,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createPolicy(Map<String, dynamic> policy) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.createPolicy(policy);
      await loadPolicies();
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

  Future<bool> updatePolicy({
    required String policyId,
    required Map<String, dynamic> policy,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.updatePolicy(policyId: policyId, policy: policy);
      await loadPolicies();
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


