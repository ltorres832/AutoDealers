// Provider de CRM - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/models/lead.dart';
import '../../data/repositories/crm_repository.dart';
import '../../data/services/firestore_service.dart';

class CrmProvider extends ChangeNotifier {
  final CrmRepository _crmRepository = CrmRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Lead> _leads = [];
  Lead? _selectedLead;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Lead>>? _leadsSubscription;

  List<Lead> get leads => _leads;
  Lead? get selectedLead => _selectedLead;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadLeads();
  }

  // Cargar leads
  Future<void> loadLeads({
    LeadStatus? status,
    String? assignedTo,
    LeadSource? source,
  }) async {
    // Cancelar suscripción anterior si existe
    _leadsSubscription?.cancel();
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _leadsSubscription = _crmRepository.watchLeads(
        tenantId: _tenantId,
        status: status,
        assignedTo: assignedTo,
        source: source,
      ).listen(
        (leads) {
          _leads = leads;
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
    _leadsSubscription?.cancel();
    super.dispose();
  }

  // Seleccionar lead
  void selectLead(Lead lead) {
    _selectedLead = lead;
    notifyListeners();
  }

  // Crear lead
  Future<bool> createLead(Lead lead) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _crmRepository.createLead(lead, tenantId: _tenantId);
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

  // Actualizar lead
  Future<bool> updateLead(String leadId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _crmRepository.updateLead(leadId, updates, tenantId: _tenantId);
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

  // Eliminar lead
  Future<bool> deleteLead(String leadId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _crmRepository.deleteLead(leadId, tenantId: _tenantId);
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

  // Agregar interacción
  Future<bool> addInteraction(String leadId, Interaction interaction) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _crmRepository.addInteraction(leadId, interaction, tenantId: _tenantId);
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


