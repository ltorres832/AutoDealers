// Provider para lista de vehículos a comparar (como Next.js)
import 'package:flutter/foundation.dart';

class CompareProvider extends ChangeNotifier {
  final List<({String id, String tenantId})> _items = [];

  List<({String id, String tenantId})> get items => List.unmodifiable(_items);
  int get count => _items.length;

  void add(String vehicleId, String tenantId) {
    if (_items.any((e) => e.id == vehicleId && e.tenantId == tenantId)) return;
    _items.add((id: vehicleId, tenantId: tenantId));
    notifyListeners();
  }

  void remove(String vehicleId) {
    _items.removeWhere((e) => e.id == vehicleId);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  String get queryParams {
    if (_items.isEmpty) return '';
    final ids = _items.map((e) => e.id).join(',');
    final tenants = _items.map((e) => e.tenantId).join(',');
    return 'vehicles=${Uri.encodeComponent(ids)}&tenants=${Uri.encodeComponent(tenants)}';
  }
}


