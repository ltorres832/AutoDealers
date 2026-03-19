// Provider de Contracts - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/contracts_repository.dart';
import '../../data/services/firestore_service.dart';

class ContractsProvider extends ChangeNotifier {
  final ContractsRepository _contractsRepository = ContractsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _contracts = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get contracts => _contracts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadContracts();
  }

  // Cargar contratos (stream en tiempo real)
  Future<void> loadContracts({String? saleId, String? leadId, String? status}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _contractsRepository.watchContracts(
        tenantId: _tenantId,
        saleId: saleId,
        leadId: leadId,
        status: status,
      ).listen((contracts) {
        _contracts = contracts;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear contrato
  Future<bool> createContract(Map<String, dynamic> contract) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _contractsRepository.createContract(
        tenantId: _tenantId!,
        contract: contract,
      );
      await loadContracts();
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

  // Enviar para firma
  Future<bool> sendForSignature(String contractId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _contractsRepository.sendForSignature(
        tenantId: _tenantId!,
        contractId: contractId,
      );
      await loadContracts();
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

  // Firmar contrato
  Future<bool> signContract({
    required String contractId,
    required Map<String, dynamic> signature,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _contractsRepository.signContract(
        tenantId: _tenantId!,
        contractId: contractId,
        signature: signature,
      );
      await loadContracts();
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

  // Eliminar contrato/plantilla
  Future<bool> deleteContract(String contractId) async {
    if (_tenantId == null) return false;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _contractsRepository.deleteContract(
        tenantId: _tenantId!,
        contractId: contractId,
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


