// Provider de Corporate Emails - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/corporate_emails_repository.dart';

class CorporateEmailsProvider extends ChangeNotifier {
  final CorporateEmailsRepository _corporateEmailsRepository = CorporateEmailsRepository();

  List<Map<String, dynamic>> _corporateEmails = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get corporateEmails => _corporateEmails;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar corporate emails (stream en tiempo real)
  Future<void> loadCorporateEmails() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _corporateEmailsRepository.watchCorporateEmails().listen((emails) {
        _corporateEmails = emails;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Crear corporate email
  Future<bool> createCorporateEmail(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _corporateEmailsRepository.createCorporateEmail(email);
      await loadCorporateEmails();
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

  // Activar corporate email
  Future<bool> activateCorporateEmail(String emailId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _corporateEmailsRepository.activateCorporateEmail(emailId);
      await loadCorporateEmails();
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

  // Suspender corporate email
  Future<bool> suspendCorporateEmail(String emailId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _corporateEmailsRepository.suspendCorporateEmail(emailId);
      await loadCorporateEmails();
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
  Future<bool> activateEmail(String emailId) => activateCorporateEmail(emailId);
  Future<bool> suspendEmail(String emailId) => suspendCorporateEmail(emailId);
  
  // Eliminar corporate email
  Future<bool> deleteEmail(String emailId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _corporateEmailsRepository.deleteCorporateEmail(emailId);
      await loadCorporateEmails();
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


