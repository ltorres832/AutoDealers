// Provider de Reminders - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/reminders_repository.dart';
import '../../data/services/firestore_service.dart';

class RemindersProvider extends ChangeNotifier {
  final RemindersRepository _remindersRepository = RemindersRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _reminders = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get reminders => _reminders;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadReminders();
  }

  // Cargar recordatorios (stream en tiempo real)
  Future<void> loadReminders({String? status}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _remindersRepository.watchReminders(
        tenantId: _tenantId,
        status: status,
      ).listen((reminders) {
        _reminders = reminders;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear recordatorios post-venta
  Future<bool> createPostSaleReminders({
    required String saleId,
    required String customerId,
    required String vehicleId,
    List<String>? selectedReminders,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _remindersRepository.createPostSaleReminders(
        tenantId: _tenantId!,
        saleId: saleId,
        customerId: customerId,
        vehicleId: vehicleId,
        selectedReminders: selectedReminders,
      );
      await loadReminders();
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

  // Cancelar recordatorio
  Future<bool> cancelReminder(String reminderId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _remindersRepository.cancelReminder(
        tenantId: _tenantId!,
        reminderId: reminderId,
      );
      await loadReminders();
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


