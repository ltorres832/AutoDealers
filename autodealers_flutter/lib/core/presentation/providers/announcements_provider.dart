// Provider de Announcements - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/announcements_repository.dart';
import '../../data/services/firestore_service.dart';

class AnnouncementsProvider extends ChangeNotifier {
  final AnnouncementsRepository _announcementsRepository = AnnouncementsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _announcements = [];
  List<Map<String, dynamic>> _activeAnnouncements = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  String? _userId;

  List<Map<String, dynamic>> get announcements => _announcements;
  List<Map<String, dynamic>> get activeAnnouncements => _activeAnnouncements;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId, String? userId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    _userId = userId;
    await loadAnnouncements();
    await loadActiveAnnouncements();
  }

  // Cargar anuncios (stream en tiempo real)
  Future<void> loadAnnouncements({bool? activeOnly}) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _announcementsRepository.watchAnnouncements(
        tenantId: _tenantId,
        activeOnly: activeOnly,
      ).listen((announcements) {
        _announcements = announcements;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar anuncios activos
  Future<void> loadActiveAnnouncements() async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _activeAnnouncements = await _announcementsRepository.getActiveAnnouncements(
        tenantId: _tenantId!,
        userId: _userId,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear anuncio
  Future<bool> createAnnouncement({
    required Map<String, dynamic> announcement,
    bool sendNotifications = true,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _announcementsRepository.createAnnouncement(
        tenantId: _tenantId!,
        announcement: announcement,
        sendNotifications: sendNotifications,
      );
      await loadAnnouncements();
      await loadActiveAnnouncements();
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

  // Descartar anuncio
  Future<bool> dismissAnnouncement(String announcementId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _announcementsRepository.dismissAnnouncement(
        tenantId: _tenantId!,
        announcementId: announcementId,
      );
      await loadActiveAnnouncements();
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

  // Eliminar anuncio
  Future<bool> deleteAnnouncement(String announcementId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _announcementsRepository.deleteAnnouncement(
        tenantId: _tenantId!,
        announcementId: announcementId,
      );
      await loadAnnouncements();
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


