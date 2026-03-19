// Provider de Reportes - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/reports_repository.dart';
import '../../data/services/firestore_service.dart';

class ReportsProvider extends ChangeNotifier {
  final ReportsRepository _reportsRepository = ReportsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  Map<String, dynamic>? _leadsReport;
  Map<String, dynamic>? _salesReport;
  Map<String, dynamic>? _performanceReport;
  List<Map<String, dynamic>> _socialMediaReports = [];
  Map<String, dynamic>? _aiReport;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  Map<String, dynamic>? get leadsReport => _leadsReport;
  Map<String, dynamic>? get salesReport => _salesReport;
  Map<String, dynamic>? get performanceReport => _performanceReport;
  List<Map<String, dynamic>> get socialMediaReports => _socialMediaReports;
  Map<String, dynamic>? get aiReport => _aiReport;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
  }

  // Generar reporte de leads
  Future<bool> generateLeadsReport({Map<String, dynamic>? filters}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _leadsReport = await _reportsRepository.getLeadsReport(
        tenantId: _tenantId!,
        filters: filters,
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

  // Generar reporte de ventas
  Future<bool> generateSalesReport({Map<String, dynamic>? filters}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _salesReport = await _reportsRepository.getSalesReport(
        tenantId: _tenantId!,
        filters: filters,
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

  // Generar reporte de rendimiento
  Future<bool> generatePerformanceReport({
    required String sellerId,
    Map<String, dynamic>? filters,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _performanceReport = await _reportsRepository.getPerformanceReport(
        tenantId: _tenantId!,
        sellerId: sellerId,
        filters: filters,
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

  // Generar reporte de redes sociales
  Future<bool> generateSocialMediaReport({Map<String, dynamic>? filters}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _socialMediaReports = await _reportsRepository.getSocialMediaReport(
        tenantId: _tenantId!,
        filters: filters,
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

  // Generar reporte de IA
  Future<bool> generateAIReport({Map<String, dynamic>? filters}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _aiReport = await _reportsRepository.getAIReport(
        tenantId: _tenantId!,
        filters: filters,
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


