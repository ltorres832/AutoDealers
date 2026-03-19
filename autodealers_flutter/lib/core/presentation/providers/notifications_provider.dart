// Provider de Notificaciones - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/repositories/notifications_repository.dart';
import '../../data/services/firestore_service.dart';

class NotificationsProvider extends ChangeNotifier {
  final NotificationsRepository _notificationsRepository = NotificationsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  String? _userId;
  StreamSubscription<List<Map<String, dynamic>>>? _notificationsSubscription;

  List<Map<String, dynamic>> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId, String? userId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    _userId = userId;
    await loadNotifications();
  }

  // Cargar notificaciones (stream en tiempo real)
  Future<void> loadNotifications({bool unreadOnly = false, int? limit}) async {
    if (_tenantId == null || _userId == null) return;

    // Cancelar suscripción anterior si existe
    _notificationsSubscription?.cancel();

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _notificationsSubscription = _notificationsRepository.watchNotifications(
        tenantId: _tenantId,
        userId: _userId,
        unreadOnly: unreadOnly,
        limit: limit,
      ).listen(
        (notifications) {
          _notifications = notifications;
          _unreadCount = notifications.where((n) => n['read'] == false).length;
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
    _notificationsSubscription?.cancel();
    super.dispose();
  }

  // Marcar como leída
  Future<bool> markAsRead(String notificationId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _notificationsRepository.markAsRead(
        tenantId: _tenantId!,
        notificationId: notificationId,
      );
      await loadNotifications();
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

  // Marcar todas como leídas
  Future<bool> markAllAsRead() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _notificationsRepository.markAllAsRead(
        tenantId: _tenantId!,
        userId: _userId!,
      );
      await loadNotifications();
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

  // Crear notificación
  Future<bool> createNotification({
    required String userId,
    required String type,
    required String title,
    required String message,
    List<String>? channels,
    Map<String, dynamic>? metadata,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _notificationsRepository.createNotification(
        tenantId: _tenantId!,
        userId: userId,
        type: type,
        title: title,
        message: message,
        channels: channels,
        metadata: metadata,
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


