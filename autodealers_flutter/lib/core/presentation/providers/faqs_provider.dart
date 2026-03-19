// Provider de FAQs - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/faqs_repository.dart';
import '../../data/services/firestore_service.dart';

class FAQsProvider extends ChangeNotifier {
  final FAQsRepository _faqsRepository = FAQsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _faqs = [];
  Map<String, dynamic>? _selectedFAQ;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get faqs => _faqs;
  Map<String, dynamic>? get selectedFAQ => _selectedFAQ;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadFAQs();
  }

  // Cargar FAQs
  Future<void> loadFAQs({bool activeOnly = true}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_tenantId != null) {
        _faqsRepository.watchFAQs(
          tenantId: _tenantId,
          activeOnly: activeOnly,
        ).listen((faqs) {
          _faqs = faqs;
          _isLoading = false;
          notifyListeners();
        });
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Seleccionar FAQ
  void selectFAQ(Map<String, dynamic> faq) {
    _selectedFAQ = faq;
    notifyListeners();
  }

  // Crear FAQ
  Future<bool> createFAQ(Map<String, dynamic> faq) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _faqsRepository.createFAQ(
        tenantId: _tenantId ?? '',
        faq: faq,
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

  // Actualizar FAQ
  Future<bool> updateFAQ(String faqId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _faqsRepository.updateFAQ(
        tenantId: _tenantId ?? '',
        faqId: faqId,
        updates: updates,
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

  // Eliminar FAQ
  Future<bool> deleteFAQ(String faqId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _faqsRepository.deleteFAQ(
        tenantId: _tenantId ?? '',
        faqId: faqId,
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


