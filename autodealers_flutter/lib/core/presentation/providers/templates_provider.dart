import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/repositories/templates_repository.dart';
import '../../data/repositories/tenant_api_repository.dart';

class TemplatesProvider extends ChangeNotifier {
  final TemplatesRepository _templatesRepository = TemplatesRepository();

  List<Map<String, dynamic>> _templates = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  TenantApp _app = TenantApp.dealer;

  StreamSubscription<List<Map<String, dynamic>>>? _subscription;

  List<Map<String, dynamic>> get templates => _templates;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize({
    required String? tenantId,
    TenantApp app = TenantApp.dealer,
    String? type,
    String? role,
  }) async {
    _tenantId = tenantId;
    _app = app;
    await loadTemplates(type: type, role: role);
  }

  Future<void> loadTemplates({String? type, String? role}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    await _subscription?.cancel();
    try {
      _subscription = _templatesRepository
          .watchTemplates(tenantId: _tenantId, type: type, role: role)
          .listen(
        (templates) {
          _templates = templates;
          _isLoading = false;
          notifyListeners();
        },
        onError: (e) {
          _error = e.toString();
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

  Future<int> initializeDefaultTemplates() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final api = TenantApiRepository(_app);
      final result = await api.initializeDefaultTemplates();
      final count = (result['count'] as num?)?.toInt() ?? 0;
      _isLoading = false;
      notifyListeners();
      return count;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
