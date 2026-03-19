// Provider de Banners - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/banners_repository.dart';
import '../../data/services/firestore_service.dart';

class BannersProvider extends ChangeNotifier {
  final BannersRepository _bannersRepository = BannersRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _banners = [];
  List<Map<String, dynamic>> _publicBanners = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get banners => _banners;
  List<Map<String, dynamic>> get tenantBanners => _banners; // Alias para compatibilidad
  List<Map<String, dynamic>> get publicBanners => _publicBanners;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadBanners();
    await loadPublicBanners();
  }

  // Cargar banners (stream en tiempo real)
  Future<void> loadBanners({String? status, bool? approved}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _bannersRepository.watchBanners(
        tenantId: _tenantId,
        status: status,
        approved: approved,
      ).listen((banners) {
        _banners = banners;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar banners públicos
  Future<void> loadPublicBanners() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _publicBanners = await _bannersRepository.getPublicBanners();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear banner
  Future<bool> createBanner(Map<String, dynamic> banner) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _bannersRepository.createBanner(
        tenantId: _tenantId!,
        banner: banner,
      );
      await loadBanners();
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

  // Aprobar banner
  Future<bool> approveBanner(String bannerId) async {
    if (_tenantId == null) return false;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _bannersRepository.approveBanner(
        tenantId: _tenantId!,
        bannerId: bannerId,
      );
      await loadBanners();
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

  // Registrar click
  Future<void> recordClick(String bannerId) async {
    try {
      await _bannersRepository.recordBannerClick(
        tenantId: _tenantId!,
        bannerId: bannerId,
      );
    } catch (e) {
      // Silenciar errores de clicks
      print('Error al registrar click: $e');
    }
  }
}


