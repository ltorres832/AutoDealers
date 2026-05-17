import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/repositories/customer_files_repository.dart';
import '../../data/services/firestore_service.dart';

class CustomerFilesProvider extends ChangeNotifier {
  final CustomerFilesRepository _customerFilesRepository = CustomerFilesRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _customerFiles = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  StreamSubscription<List<Map<String, dynamic>>>? _subscription;

  List<Map<String, dynamic>> get customerFiles => _customerFiles;
  List<Map<String, dynamic>> get files => _customerFiles;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    if (_tenantId == null || _tenantId!.isEmpty) {
      _error = 'No se encontró tenant';
      _isLoading = false;
      notifyListeners();
      return;
    }
    await loadCustomerFiles();
  }

  Future<void> loadCustomerFiles({
    String? customerId,
    String? sellerId,
    String? saleId,
    String? status,
  }) async {
    if (_tenantId == null || _tenantId!.isEmpty) {
      _isLoading = false;
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    await _subscription?.cancel();
    _subscription = _customerFilesRepository
        .watchCustomerFiles(
          tenantId: _tenantId,
          customerId: customerId,
          sellerId: sellerId,
          saleId: saleId,
          status: status,
        )
        .listen(
      (files) {
        _customerFiles = files;
        _isLoading = false;
        _error = null;
        notifyListeners();
      },
      onError: (e) {
        _error = e.toString();
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  Future<bool> requestDocument({
    required String fileId,
    required String documentName,
    required String documentType,
    required String requestedBy,
    String? description,
    bool required = true,
  }) async {
    if (_tenantId == null) return false;
    try {
      await _customerFilesRepository.requestDocument(
        tenantId: _tenantId!,
        fileId: fileId,
        documentName: documentName,
        documentType: documentType,
        requestedBy: requestedBy,
        description: description,
        required: required,
      );
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<Map<String, dynamic>?> getFileById(String fileId) async {
    if (_tenantId == null) return null;
    try {
      return await _customerFilesRepository.getCustomerFileById(
        tenantId: _tenantId!,
        fileId: fileId,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
