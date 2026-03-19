// Provider de Pre-Qualifications - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/pre_qualifications_repository.dart';
import '../../data/services/firestore_service.dart';

class PreQualificationsProvider extends ChangeNotifier {
  final PreQualificationsRepository _repository = PreQualificationsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _preQualifications = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get preQualifications => _preQualifications;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadPreQualifications();
  }

  Future<void> loadPreQualifications({String? status, int? limit}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _preQualifications = await _repository.getPreQualifications(
        tenantId: _tenantId!,
        status: status,
        limit: limit,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createPreQualification({
    required Map<String, dynamic> clientInfo,
    Map<String, dynamic>? vehicleInfo,
    Map<String, dynamic>? financialInfo,
    String? status,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.createPreQualification(
        tenantId: _tenantId!,
        clientInfo: clientInfo,
        vehicleInfo: vehicleInfo,
        financialInfo: financialInfo,
        status: status,
      );
      await loadPreQualifications();
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

  Future<bool> updatePreQualification({
    required String preQualificationId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.updatePreQualification(
        tenantId: _tenantId!,
        preQualificationId: preQualificationId,
        updates: updates,
      );
      await loadPreQualifications();
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


