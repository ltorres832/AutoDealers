// Provider de Maintenance - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/maintenance_repository.dart';

class MaintenanceProvider extends ChangeNotifier {
  final MaintenanceRepository _maintenanceRepository = MaintenanceRepository();

  Map<String, dynamic> _status = {
    'enabled': false,
    'message': '',
  };
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic> get status => _status;
  Map<String, dynamic> get maintenanceStatus => _status; // Alias para compatibilidad
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isInMaintenance => _status['enabled'] == true;

  // Cargar estado de mantenimiento
  Future<void> loadMaintenanceStatus() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _maintenanceRepository.watchMaintenanceStatus().listen((status) {
        _status = status;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Verificar modo de mantenimiento
  Future<bool> checkMaintenanceMode() async {
    try {
      final result = await _maintenanceRepository.checkMaintenanceMode();
      return result['inMaintenance'] == true;
    } catch (e) {
      return false;
    }
  }

  // Activar/Desactivar modo de mantenimiento
  Future<bool> setMaintenanceMode({
    required bool enabled,
    String? message,
    DateTime? scheduledStart,
    DateTime? scheduledEnd,
    List<String>? allowedIPs,
    List<String>? allowedUsers,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _maintenanceRepository.setMaintenanceMode(
        enabled: enabled,
        message: message,
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd,
        allowedIPs: allowedIPs,
        allowedUsers: allowedUsers,
      );
      _status['enabled'] = enabled;
      _status['message'] = message ?? '';
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


