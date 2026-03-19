// Provider de Referrals - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/referrals_repository.dart';

class ReferralsProvider extends ChangeNotifier {
  final ReferralsRepository _referralsRepository = ReferralsRepository();

  String? _referralCode;
  List<Map<String, dynamic>> _myReferrals = [];
  Map<String, dynamic>? _myRewards;
  bool _isLoading = false;
  String? _error;
  String? _userId;

  String? get referralCode => _referralCode;
  List<Map<String, dynamic>> get myReferrals => _myReferrals;
  List<Map<String, dynamic>> get userReferrals => _myReferrals; // Alias para compatibilidad
  Map<String, dynamic>? get myRewards => _myRewards;
  List<Map<String, dynamic>> get userRewards => _myRewards != null ? [_myRewards!] : []; // Alias para compatibilidad
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String userId) async {
    _userId = userId;
    await loadReferralCode();
    await loadMyReferrals();
    await loadMyRewards();
  }

  // Cargar código de referido
  Future<void> loadReferralCode() async {
    if (_userId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _referralCode = await _referralsRepository.getReferralCode(_userId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar referidos
  Future<void> loadMyReferrals() async {
    if (_userId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _myReferrals = await _referralsRepository.getMyReferrals(_userId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar recompensas
  Future<void> loadMyRewards() async {
    if (_userId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _myRewards = await _referralsRepository.getMyRewards(_userId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Usar código de referido
  Future<bool> useReferralCode(String referralCode) async {
    if (_userId == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _referralsRepository.useReferralCode(
        referralCode: referralCode,
        newUserId: _userId!,
      );
      await loadMyReferrals();
      await loadMyRewards();
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


