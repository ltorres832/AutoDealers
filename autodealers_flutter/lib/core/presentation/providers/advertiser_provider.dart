// Provider para el rol Advertiser - anuncios y facturación
import 'package:flutter/foundation.dart';
import '../../data/repositories/advertiser_repository.dart';

class AdvertiserProvider extends ChangeNotifier {
  final AdvertiserRepository _repo = AdvertiserRepository();

  Map<String, dynamic>? _advertiser;
  Map<String, dynamic>? _selectedAd;
  List<Map<String, dynamic>> _ads = [];
  List<Map<String, dynamic>> _paymentMethods = [];
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get advertiser => _advertiser;
  Map<String, dynamic>? get selectedAd => _selectedAd;
  List<Map<String, dynamic>> get ads => _ads;
  List<Map<String, dynamic>> get paymentMethods => _paymentMethods;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadAdvertiser() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _advertiser = await _repo.getMe();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadAds() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _ads = await _repo.getAds();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadPaymentMethods() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _paymentMethods = await _repo.getPaymentMethods();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadAd(String adId) async {
    _isLoading = true;
    _error = null;
    _selectedAd = null;
    notifyListeners();
    try {
      _selectedAd = await _repo.getAd(adId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Crea anuncio. Retorna map con ad y/o payment (url o clientSecret) o null si error.
  Future<Map<String, dynamic>?> createAd(Map<String, dynamic> body) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _repo.createAd(body);
      _isLoading = false;
      if (result != null) await loadAds();
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> pauseResumeAd(String adId, bool pause) async {
    try {
      final ok = await _repo.pauseAd(adId, pause: pause);
      if (ok) await loadAds();
      return ok;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<String?> createSetupSession(String methodType) async {
    try {
      return await _repo.createSetupSession(methodType: methodType);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<bool> setDefaultPaymentMethod(String paymentMethodId) async {
    try {
      final ok = await _repo.setDefaultPaymentMethod(paymentMethodId);
      if (ok) await loadPaymentMethods();
      return ok;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> detachPaymentMethod(String paymentMethodId) async {
    try {
      final ok = await _repo.detachPaymentMethod(paymentMethodId);
      if (ok) await loadPaymentMethods();
      return ok;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}


