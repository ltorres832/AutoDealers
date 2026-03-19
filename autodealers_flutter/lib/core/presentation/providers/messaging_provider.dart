// Provider de Mensajería - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/models/message.dart';
import '../../data/repositories/messaging_repository.dart';
import '../../data/services/firestore_service.dart';

class MessagingProvider extends ChangeNotifier {
  final MessagingRepository _messagingRepository = MessagingRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Message> _messages = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Message>>? _messagesSubscription;

  List<Message> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadMessages();
  }

  // Cargar mensajes
  Future<void> loadMessages({
    String? leadId,
    MessageChannel? channel,
  }) async {
    // Cancelar suscripción anterior si existe
    _messagesSubscription?.cancel();
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _messagesSubscription = _messagingRepository.watchMessages(
        tenantId: _tenantId,
        leadId: leadId,
        channel: channel,
      ).listen(
        (messages) {
          _messages = messages;
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
    _messagesSubscription?.cancel();
    super.dispose();
  }

  // Enviar mensaje
  Future<bool> sendMessage(Message message) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _messagingRepository.sendMessage(message, tenantId: _tenantId);
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

  // Actualizar estado de mensaje
  Future<bool> updateMessageStatus(String messageId, MessageStatus status) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _messagingRepository.updateMessageStatus(
        messageId,
        status,
        tenantId: _tenantId,
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


