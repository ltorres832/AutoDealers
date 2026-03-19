// Provider de Citas - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/models/appointment.dart';
import '../../data/repositories/appointments_repository.dart';
import '../../data/services/firestore_service.dart';

class AppointmentsProvider extends ChangeNotifier {
  final AppointmentsRepository _appointmentsRepository = AppointmentsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Appointment> _appointments = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Appointment>>? _appointmentsSubscription;

  List<Appointment> get appointments => _appointments;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadAppointments();
  }

  Future<void> loadAppointments({
    String? leadId,
    String? assignedTo,
    AppointmentStatus? status,
  }) async {
    // Cancelar suscripción anterior si existe
    _appointmentsSubscription?.cancel();
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _appointmentsSubscription = _appointmentsRepository.watchAppointments(
        tenantId: _tenantId,
        leadId: leadId,
        assignedTo: assignedTo,
        status: status,
      ).listen(
        (appointments) {
          _appointments = appointments;
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
    _appointmentsSubscription?.cancel();
    super.dispose();
  }

  Future<bool> createAppointment(Appointment appointment) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _appointmentsRepository.createAppointment(appointment, tenantId: _tenantId);
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

  Future<bool> updateAppointment(String appointmentId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _appointmentsRepository.updateAppointment(
        appointmentId,
        updates,
        tenantId: _tenantId,
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


