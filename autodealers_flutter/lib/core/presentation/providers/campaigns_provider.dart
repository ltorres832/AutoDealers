// Provider de Campaigns - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/campaigns_repository.dart';
import '../../data/services/firestore_service.dart';

class CampaignsProvider extends ChangeNotifier {
  final CampaignsRepository _campaignsRepository = CampaignsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _campaigns = [];
  Map<String, dynamic>? _selectedCampaign;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get campaigns => _campaigns;
  Map<String, dynamic>? get selectedCampaign => _selectedCampaign;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadCampaigns();
  }

  // Cargar campañas
  Future<void> loadCampaigns({
    String? status,
    String? platform,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_tenantId != null) {
        _campaignsRepository.watchCampaigns(
          tenantId: _tenantId,
          status: status,
          platform: platform,
        ).listen((campaigns) {
          _campaigns = campaigns;
          _isLoading = false;
          notifyListeners();
        });
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Seleccionar campaña
  void selectCampaign(Map<String, dynamic> campaign) {
    _selectedCampaign = campaign;
    notifyListeners();
  }

  // Crear campaña
  Future<bool> createCampaign(Map<String, dynamic> campaign) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _campaignsRepository.createCampaign(
        tenantId: _tenantId ?? '',
        campaign: campaign,
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

  // Actualizar campaña
  Future<bool> updateCampaign(String campaignId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _campaignsRepository.updateCampaign(
        tenantId: _tenantId ?? '',
        campaignId: campaignId,
        updates: updates,
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

  // Eliminar campaña
  Future<bool> deleteCampaign(String campaignId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _campaignsRepository.deleteCampaign(
        tenantId: _tenantId ?? '',
        campaignId: campaignId,
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


