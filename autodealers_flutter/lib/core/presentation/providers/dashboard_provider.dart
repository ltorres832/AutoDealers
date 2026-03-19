// Provider de Dashboard - stats por tenant (Dealer/Seller), actualización periódica
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/repositories/dashboard_repository.dart';

class DashboardProvider extends ChangeNotifier {
  final DashboardRepository _repo = DashboardRepository();

  DashboardStats? _stats;
  bool _isLoading = false;
  String? _error;
  String? _lastTenantId;
  Timer? _refreshTimer;

  DashboardStats? get stats => _stats;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadStats(String? tenantId) async {
    if (tenantId == null || tenantId.isEmpty) {
      _refreshTimer?.cancel();
      _refreshTimer = null;
      _stats = null;
      _lastTenantId = null;
      notifyListeners();
      return;
    }
    final isFirstLoad = _lastTenantId != tenantId || _stats == null;
    _lastTenantId = tenantId;
    if (isFirstLoad) _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _stats = await _repo.getStats(tenantId);
      _error = null;
      _refreshTimer?.cancel();
      _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
        if (_lastTenantId != null) _refreshStatsQuiet();
      });
    } catch (e) {
      _error = e.toString();
      _stats = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _refreshStatsQuiet() async {
    if (_lastTenantId == null) return;
    try {
      final newStats = await _repo.getStats(_lastTenantId!);
      _stats = newStats;
      notifyListeners();
    } catch (_) {}
  }

  void clear() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
    _stats = null;
    _lastTenantId = null;
    _error = null;
    notifyListeners();
  }
}


