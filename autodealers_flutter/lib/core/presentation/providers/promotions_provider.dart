// Provider de Promotions - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/promotions_repository.dart';
import '../../data/services/firestore_service.dart';

class PromotionsProvider extends ChangeNotifier {
  final PromotionsRepository _promotionsRepository = PromotionsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _promotions = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get promotions => _promotions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadPromotions();
  }

  // Cargar promociones (stream en tiempo real)
  Future<void> loadPromotions({String? status, String? type}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _promotionsRepository.watchPromotions(
        tenantId: _tenantId,
        status: status,
        type: type,
      ).listen((promotions) {
        _promotions = promotions;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear promoción
  Future<bool> createPromotion(Map<String, dynamic> promotion) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _promotionsRepository.createPromotion(
        tenantId: _tenantId!,
        promotion: promotion,
      );
      await loadPromotions();
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

  // Actualizar promoción
  Future<bool> updatePromotion({
    required String promotionId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _promotionsRepository.updatePromotion(
        tenantId: _tenantId!,
        promotionId: promotionId,
        updates: updates,
      );
      await loadPromotions();
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

  // Activar promoción
  Future<bool> activatePromotion(String promotionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _promotionsRepository.activatePromotion(
        tenantId: _tenantId!,
        promotionId: promotionId,
      );
      await loadPromotions();
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

  // Pausar promoción
  Future<bool> pausePromotion(String promotionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _promotionsRepository.pausePromotion(
        tenantId: _tenantId!,
        promotionId: promotionId,
      );
      await loadPromotions();
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

  // Eliminar promoción
  Future<bool> deletePromotion(String promotionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _promotionsRepository.deletePromotion(
        tenantId: _tenantId!,
        promotionId: promotionId,
      );
      await loadPromotions();
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

  // Enviar promoción a leads
  Future<bool> sendPromotionToLeads(String promotionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _promotionsRepository.sendPromotionToLeads(
        tenantId: _tenantId!,
        promotionId: promotionId,
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


