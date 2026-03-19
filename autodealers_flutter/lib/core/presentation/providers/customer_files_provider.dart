// Provider de Customer Files - Presentation Layer
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

  List<Map<String, dynamic>> get customerFiles => _customerFiles;
  List<Map<String, dynamic>> get files => _customerFiles; // Alias para compatibilidad
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadCustomerFiles();
  }

  // Cargar customer files (stream en tiempo real)
  Future<void> loadCustomerFiles({
    String? customerId,
    String? sellerId,
    String? saleId,
    String? status,
  }) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _customerFilesRepository.watchCustomerFiles(
        tenantId: _tenantId,
        customerId: customerId,
        sellerId: sellerId,
        saleId: saleId,
        status: status,
      ).listen((files) {
        _customerFiles = files;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Solicitar documento
  Future<bool> requestDocument({
    required String fileId,
    required String documentName,
    required String documentType,
    required String requestedBy,
    String? description,
    bool required = true,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

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
      await loadCustomerFiles();
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

  // Agregar evidencia
  Future<bool> addEvidence({
    required String fileId,
    required Map<String, dynamic> evidence,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _customerFilesRepository.addEvidence(
        tenantId: _tenantId!,
        fileId: fileId,
        evidence: evidence,
      );
      await loadCustomerFiles();
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


