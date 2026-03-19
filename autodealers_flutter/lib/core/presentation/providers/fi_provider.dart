// Provider de FI (Financing & Insurance) - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/fi_repository.dart';
import '../../data/services/firestore_service.dart';
import 'dart:async';

class FIProvider extends ChangeNotifier {
  final FIRepository _fiRepository = FIRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _fiRequests = [];
  List<Map<String, dynamic>> _fiClients = [];
  Map<String, dynamic>? _selectedRequest;
  Map<String, dynamic>? _selectedClient;
  Map<String, dynamic>? _currentCalculation;
  Map<String, dynamic>? _currentApprovalScore;
  Map<String, dynamic>? _currentCreditReport;
  Map<String, dynamic>? _currentComparison;
  Map<String, dynamic>? _metrics;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  String? _role;

  StreamSubscription<List<Map<String, dynamic>>>? _requestsSubscription;
  StreamSubscription<List<Map<String, dynamic>>>? _clientsSubscription;

  List<Map<String, dynamic>> get fiRequests => _fiRequests;
  List<Map<String, dynamic>> get fiClients => _fiClients;
  Map<String, dynamic>? get selectedRequest => _selectedRequest;
  Map<String, dynamic>? get selectedClient => _selectedClient;
  Map<String, dynamic>? get currentCalculation => _currentCalculation;
  Map<String, dynamic>? get currentApprovalScore => _currentApprovalScore;
  Map<String, dynamic>? get currentCreditReport => _currentCreditReport;
  Map<String, dynamic>? get currentComparison => _currentComparison;
  Map<String, dynamic>? get metrics => _metrics;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId, String? role) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    _role = role;
    await loadFIRequests();
    await loadFIClients();
    _setupRealtimeListeners();
  }

  void _setupRealtimeListeners() {
    // Escuchar solicitudes F&I en tiempo real
    _requestsSubscription?.cancel();
    _requestsSubscription = _fiRepository.watchFIRequests(
      tenantId: _tenantId!,
    ).listen((requests) {
      _fiRequests = requests;
      notifyListeners();
    });

    // Escuchar clientes F&I en tiempo real
    _clientsSubscription?.cancel();
    _clientsSubscription = _fiRepository.watchFIClients(
      tenantId: _tenantId!,
    ).listen((clients) {
      _fiClients = clients;
      notifyListeners();
    });
  }

  // ==================== FI Requests ====================

  /// Cargar solicitudes F&I
  Future<void> loadFIRequests({
    String? status,
    String? clientId,
    String? createdBy,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _fiRequests = await _fiRepository.getFIRequests(
        tenantId: _tenantId!,
        status: status,
        clientId: clientId,
        createdBy: createdBy,
        role: _role,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cargar una solicitud F&I específica
  Future<void> loadFIRequest(String requestId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _selectedRequest = await _fiRepository.getFIRequest(
        tenantId: _tenantId!,
        requestId: requestId,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Crear solicitud F&I
  Future<bool> createFIRequest({
    required String clientId,
    required Map<String, dynamic> employment,
    required Map<String, dynamic> creditInfo,
    required Map<String, dynamic> personalInfo,
    String? sellerNotes,
    bool submit = false,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final request = await _fiRepository.createFIRequest(
        tenantId: _tenantId!,
        clientId: clientId,
        employment: employment,
        creditInfo: creditInfo,
        personalInfo: personalInfo,
        sellerNotes: sellerNotes,
        submit: submit,
      );

      // Recargar solicitudes
      await loadFIRequests();
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

  /// Actualizar solicitud F&I
  Future<bool> updateFIRequest({
    required String requestId,
    String? status,
    String? fiManagerNotes,
    String? internalNotes,
    String? note,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _selectedRequest = await _fiRepository.updateFIRequest(
        tenantId: _tenantId!,
        requestId: requestId,
        status: status,
        fiManagerNotes: fiManagerNotes,
        internalNotes: internalNotes,
        note: note,
      );

      // Recargar solicitudes
      await loadFIRequests();
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

  /// Enviar solicitud F&I
  Future<bool> submitFIRequest({
    required String requestId,
    String? sellerNotes,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _selectedRequest = await _fiRepository.submitFIRequest(
        tenantId: _tenantId!,
        requestId: requestId,
        sellerNotes: sellerNotes,
      );

      // Recargar solicitudes
      await loadFIRequests();
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

  // ==================== FI Clients ====================

  /// Cargar clientes F&I
  Future<void> loadFIClients() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _fiClients = await _fiRepository.getFIClients(
        tenantId: _tenantId!,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Crear cliente F&I
  Future<bool> createFIClient({
    required String name,
    required String phone,
    String? email,
    String? address,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    double? vehiclePrice,
    double? downPayment,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _fiRepository.createFIClient(
        tenantId: _tenantId!,
        name: name,
        phone: phone,
        email: email,
        address: address,
        vehicleMake: vehicleMake,
        vehicleModel: vehicleModel,
        vehicleYear: vehicleYear,
        vehiclePrice: vehiclePrice,
        downPayment: downPayment,
      );

      // Recargar clientes
      await loadFIClients();
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

  // ==================== Calculator ====================

  /// Calcular financiamiento
  Future<void> calculateFinancing({
    String? requestId,
    required double vehiclePrice,
    required double downPayment,
    required double interestRate,
    required int termMonths,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentCalculation = await _fiRepository.calculateFinancing(
        tenantId: _tenantId!,
        requestId: requestId,
        vehiclePrice: vehiclePrice,
        downPayment: downPayment,
        interestRate: interestRate,
        termMonths: termMonths,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== Approval Score ====================

  /// Calcular score de aprobación
  Future<void> calculateApprovalScore({
    required String requestId,
    required double vehiclePrice,
    required double downPayment,
    required double monthlyPayment,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentApprovalScore = await _fiRepository.calculateApprovalScore(
        tenantId: _tenantId!,
        requestId: requestId,
        vehiclePrice: vehiclePrice,
        downPayment: downPayment,
        monthlyPayment: monthlyPayment,
      );

      // Actualizar solicitud seleccionada si es la misma
      if (_selectedRequest != null && _selectedRequest!['id'] == requestId) {
        await loadFIRequest(requestId);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== Credit Report ====================

  /// Obtener reporte de crédito
  Future<void> getCreditReport({
    required String clientId,
    String? provider,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentCreditReport = await _fiRepository.getCreditReport(
        tenantId: _tenantId!,
        clientId: clientId,
        provider: provider,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== Financing Options ====================

  /// Comparar opciones de financiamiento
  Future<void> compareFinancingOptions({
    required String requestId,
    required List<Map<String, dynamic>> options,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _currentComparison = await _fiRepository.compareFinancingOptions(
        tenantId: _tenantId!,
        requestId: requestId,
        options: options,
      );

      // Actualizar solicitud seleccionada si es la misma
      if (_selectedRequest != null && _selectedRequest!['id'] == requestId) {
        await loadFIRequest(requestId);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== Documents ====================

  /// Generar documento F&I
  Future<Map<String, dynamic>?> generateFIDocument({
    required String requestId,
    required String template,
    Map<String, dynamic>? customData,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _fiRepository.generateFIDocument(
        tenantId: _tenantId!,
        requestId: requestId,
        template: template,
        customData: customData,
      );
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Solicitar documentos
  Future<bool> requestFIDocuments({
    required String requestId,
    required List<Map<String, dynamic>> documents,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _fiRepository.requestFIDocuments(
        tenantId: _tenantId!,
        requestId: requestId,
        documents: documents,
      );

      // Actualizar solicitud seleccionada
      if (_selectedRequest != null && _selectedRequest!['id'] == requestId) {
        await loadFIRequest(requestId);
      }

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

  // ==================== Cosigner ====================

  /// Agregar cosignatario
  Future<bool> addCosigner({
    required String requestId,
    required Map<String, dynamic> cosignerInfo,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _fiRepository.addCosigner(
        tenantId: _tenantId!,
        requestId: requestId,
        cosignerInfo: cosignerInfo,
      );

      // Actualizar solicitud seleccionada
      if (_selectedRequest != null && _selectedRequest!['id'] == requestId) {
        await loadFIRequest(requestId);
      }

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

  // ==================== Metrics ====================

  /// Cargar métricas F&I
  Future<void> loadFIMetrics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _metrics = await _fiRepository.getFIMetrics(
        tenantId: _tenantId!,
        startDate: startDate,
        endDate: endDate,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== Helpers ====================

  void selectRequest(Map<String, dynamic>? request) {
    _selectedRequest = request;
    notifyListeners();
  }

  void selectClient(Map<String, dynamic>? client) {
    _selectedClient = client;
    notifyListeners();
  }

  void clearCalculation() {
    _currentCalculation = null;
    notifyListeners();
  }

  void clearApprovalScore() {
    _currentApprovalScore = null;
    notifyListeners();
  }

  void clearCreditReport() {
    _currentCreditReport = null;
    notifyListeners();
  }

  void clearComparison() {
    _currentComparison = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _requestsSubscription?.cancel();
    _clientsSubscription?.cancel();
    super.dispose();
  }
}


