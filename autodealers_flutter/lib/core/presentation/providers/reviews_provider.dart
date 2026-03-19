// Provider de Reviews - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/reviews_repository.dart';
import '../../data/services/firestore_service.dart';

class ReviewsProvider extends ChangeNotifier {
  final ReviewsRepository _reviewsRepository = ReviewsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _reviews = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get reviews => _reviews;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadReviews();
  }

  // Cargar reviews (stream en tiempo real)
  Future<void> loadReviews({String? status, String? sellerId, String? vehicleId}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _reviewsRepository.watchReviews(
        tenantId: _tenantId,
        status: status,
        sellerId: sellerId,
        vehicleId: vehicleId,
      ).listen((reviews) {
        _reviews = reviews;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear review
  Future<bool> createReview(Map<String, dynamic> review) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _reviewsRepository.createReview(
        tenantId: _tenantId!,
        review: review,
      );
      await loadReviews();
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

  // Aprobar review
  Future<bool> approveReview(String reviewId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _reviewsRepository.approveReview(
        tenantId: _tenantId!,
        reviewId: reviewId,
      );
      await loadReviews();
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

  // Responder review
  Future<bool> respondToReview({
    required String reviewId,
    required String response,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _reviewsRepository.respondToReview(
        tenantId: _tenantId!,
        reviewId: reviewId,
        response: response,
      );
      await loadReviews();
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


