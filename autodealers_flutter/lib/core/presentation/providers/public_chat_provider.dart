// Provider de Public Chat - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/public_chat_repository.dart';
import '../../data/services/firestore_service.dart';
import 'dart:async';

class PublicChatProvider extends ChangeNotifier {
  final PublicChatRepository _repository = PublicChatRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _messages = [];
  Map<String, dynamic>? _selectedConversation;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  StreamSubscription<List<Map<String, dynamic>>>? _conversationsSubscription;
  StreamSubscription<List<Map<String, dynamic>>>? _messagesSubscription;

  List<Map<String, dynamic>> get conversations => _conversations;
  List<Map<String, dynamic>> get messages => _messages;
  Map<String, dynamic>? get selectedConversation => _selectedConversation;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadConversations();
    _setupRealtimeListeners();
  }

  void _setupRealtimeListeners() {
    if (_tenantId == null) return;

    _conversationsSubscription?.cancel();
    _conversationsSubscription = _repository.watchConversations(_tenantId!).listen((conversations) {
      _conversations = conversations;
      notifyListeners();
    });
  }

  Future<void> loadConversations() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _conversations = await _repository.getConversations(_tenantId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMessages(String sessionId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _messages = await _repository.getMessages(
        tenantId: _tenantId!,
        sessionId: sessionId,
      );

      _messagesSubscription?.cancel();
      _messagesSubscription = _repository.watchMessages(
        tenantId: _tenantId!,
        sessionId: sessionId,
      ).listen((messages) {
        _messages = messages;
        notifyListeners();
      });

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> sendMessage({
    required String sessionId,
    required String clientName,
    required String content,
    String? clientEmail,
    String? clientPhone,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.sendMessage(
        tenantId: _tenantId!,
        sessionId: sessionId,
        clientName: clientName,
        content: content,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
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

  Future<bool> replyMessage({
    required String sessionId,
    required String content,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.replyMessage(
        tenantId: _tenantId!,
        sessionId: sessionId,
        content: content,
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

  Future<void> markAsRead(String sessionId) async {
    try {
      await _repository.markAsRead(
        tenantId: _tenantId!,
        sessionId: sessionId,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void selectConversation(Map<String, dynamic>? conversation) {
    _selectedConversation = conversation;
    if (conversation != null) {
      loadMessages(conversation['sessionId'] as String);
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _conversationsSubscription?.cancel();
    _messagesSubscription?.cancel();
    super.dispose();
  }
}


