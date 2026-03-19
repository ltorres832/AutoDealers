// Provider de Social Media - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/social_media_repository.dart';
import '../../data/services/firestore_service.dart';

class SocialMediaProvider extends ChangeNotifier {
  final SocialMediaRepository _socialMediaRepository = SocialMediaRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _posts = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get posts => _posts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadPosts();
  }

  // Cargar posts (stream en tiempo real)
  Future<void> loadPosts({String? status, String? platform}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _socialMediaRepository.watchSocialPosts(
        tenantId: _tenantId,
        status: status,
        platform: platform,
      ).listen((posts) {
        _posts = posts;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Publicar en Facebook
  Future<bool> publishToFacebook(Map<String, dynamic> post) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _socialMediaRepository.publishToFacebook(
        tenantId: _tenantId!,
        post: post,
      );
      await loadPosts();
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

  // Publicar en Instagram
  Future<bool> publishToInstagram(Map<String, dynamic> post) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _socialMediaRepository.publishToInstagram(
        tenantId: _tenantId!,
        post: post,
      );
      await loadPosts();
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

  // Programar post
  Future<bool> schedulePost({
    required Map<String, dynamic> post,
    required DateTime scheduledAt,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _socialMediaRepository.schedulePost(
        tenantId: _tenantId!,
        post: post,
        scheduledAt: scheduledAt,
      );
      await loadPosts();
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

  // Pausar post programado
  Future<bool> pauseScheduledPost(String postId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _socialMediaRepository.pauseScheduledPost(
        tenantId: _tenantId!,
        postId: postId,
      );
      await loadPosts();
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


