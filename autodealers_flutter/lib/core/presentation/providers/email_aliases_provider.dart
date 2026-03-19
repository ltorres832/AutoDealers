// Provider de Email Aliases - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/email_aliases_repository.dart';

class EmailAliasesProvider extends ChangeNotifier {
  final EmailAliasesRepository _repository = EmailAliasesRepository();

  List<Map<String, dynamic>> _aliases = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get aliases => _aliases;
  List<Map<String, dynamic>> get emailAliases => _aliases; // Alias para compatibilidad
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadAliases({String? dealerId, String? assignedTo}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _aliases = await _repository.getEmailAliases(
        dealerId: dealerId,
        assignedTo: assignedTo,
      );
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createAlias({
    required String alias,
    required String dealerId,
    String? assignedTo,
    String? forwardTo,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.createEmailAlias(
        alias: alias,
        dealerId: dealerId,
        assignedTo: assignedTo,
        forwardTo: forwardTo,
      );
      await loadAliases();
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

  Future<bool> updateAlias({
    required String aliasId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.updateEmailAlias(
        aliasId: aliasId,
        updates: updates,
      );
      await loadAliases();
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

  Future<bool> deleteAlias(String aliasId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.deleteEmailAlias(aliasId);
      await loadAliases();
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

  // Alias para compatibilidad
  Future<bool> deleteEmailAlias(String aliasId) => deleteAlias(aliasId);
}


