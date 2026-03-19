// Provider de Internal Chat - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/internal_chat_repository.dart';
import '../../data/services/firestore_service.dart';

class InternalChatProvider extends ChangeNotifier {
  final InternalChatRepository _internalChatRepository = InternalChatRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _users = [];
  Map<String, List<Map<String, dynamic>>> _conversations = {};
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  String? _userId;

  List<Map<String, dynamic>> get users => _users;
  Map<String, List<Map<String, dynamic>>> get conversations => _conversations;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId, String? userId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    _userId = userId;
    await loadUsers();
  }

  // Cargar usuarios
  Future<void> loadUsers() async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _users = await _internalChatRepository.getInternalChatUsers(_tenantId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cargar conversación (stream en tiempo real)
  Future<void> loadConversation(String otherUserId) async {
    if (_tenantId == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _internalChatRepository.watchConversation(
        tenantId: _tenantId!,
        otherUserId: otherUserId,
      ).listen((messages) {
        _conversations[otherUserId] = messages;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Enviar mensaje
  Future<bool> sendMessage({
    required String toUserId,
    required String message,
    String? type,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _internalChatRepository.sendInternalMessage(
        tenantId: _tenantId!,
        toUserId: toUserId,
        message: message,
        type: type,
      );
      await loadConversation(toUserId);
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

  // Marcar mensajes como leídos
  Future<void> markAsRead(String fromUserId) async {
    try {
      await _internalChatRepository.markMessagesAsRead(
        tenantId: _tenantId!,
        fromUserId: fromUserId,
      );
    } catch (e) {
      print('Error al marcar mensajes como leídos: $e');
    }
  }
}


