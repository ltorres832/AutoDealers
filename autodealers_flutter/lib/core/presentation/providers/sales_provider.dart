// Provider de Ventas - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/models/sale.dart';
import '../../data/repositories/sales_repository.dart';
import '../../data/services/firestore_service.dart';

class SalesProvider extends ChangeNotifier {
  final SalesRepository _salesRepository = SalesRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Sale> _sales = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Sale>>? _salesSubscription;

  List<Sale> get sales => _sales;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadSales();
  }

  Future<void> loadSales({
    String? leadId,
    String? sellerId,
    SaleStatus? status,
  }) async {
    // Cancelar suscripción anterior si existe
    _salesSubscription?.cancel();
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _salesSubscription = _salesRepository.watchSales(
        tenantId: _tenantId,
        leadId: leadId,
        sellerId: sellerId,
        status: status,
      ).listen(
        (sales) {
          _sales = sales;
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
    _salesSubscription?.cancel();
    super.dispose();
  }

  Future<bool> createSale(Sale sale) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _salesRepository.createSale(sale, tenantId: _tenantId);
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

  Future<bool> completeSale(String saleId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _salesRepository.completeSale(saleId, tenantId: _tenantId);
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


