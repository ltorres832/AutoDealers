// Provider de Workflows - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/repositories/workflows_repository.dart';
import '../../data/services/firestore_service.dart';

class WorkflowsProvider extends ChangeNotifier {
  final WorkflowsRepository _workflowsRepository = WorkflowsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _workflows = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Map<String, dynamic>>>? _workflowsSubscription;

  List<Map<String, dynamic>> get workflows => _workflows;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadWorkflows();
  }

  // Cargar workflows (stream en tiempo real)
  Future<void> loadWorkflows({String? status}) async {
    if (_tenantId == null) return;

    // Cancelar suscripción anterior si existe
    _workflowsSubscription?.cancel();

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _workflowsSubscription = _workflowsRepository.watchWorkflows(
        tenantId: _tenantId,
        status: status,
      ).listen(
        (workflows) {
          _workflows = workflows;
          _isLoading = false;
          notifyListeners();
        },
        onError: (error) {
          _error = error.toString();
          _isLoading = false;
          notifyListeners();
        },
      );
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _workflowsSubscription?.cancel();
    super.dispose();
  }

  // Crear workflow
  Future<bool> createWorkflow(Map<String, dynamic> workflow) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _workflowsRepository.createWorkflow(
        tenantId: _tenantId!,
        workflow: workflow,
      );
      await loadWorkflows();
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

  // Actualizar workflow
  Future<bool> updateWorkflow({
    required String workflowId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _workflowsRepository.updateWorkflow(
        tenantId: _tenantId!,
        workflowId: workflowId,
        updates: updates,
      );
      await loadWorkflows();
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

  // Eliminar workflow
  Future<bool> deleteWorkflow(String workflowId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _workflowsRepository.deleteWorkflow(
        tenantId: _tenantId!,
        workflowId: workflowId,
      );
      await loadWorkflows();
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
