// Provider de Communication Templates - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/communication_templates_repository.dart';

class CommunicationTemplatesProvider extends ChangeNotifier {
  final CommunicationTemplatesRepository _communicationTemplatesRepository = CommunicationTemplatesRepository();

  List<Map<String, dynamic>> _templates = [];
  Map<String, dynamic>? _selectedTemplate;
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get templates => _templates;
  Map<String, dynamic>? get selectedTemplate => _selectedTemplate;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar templates de comunicación
  Future<void> loadCommunicationTemplates({
    String? category,
    String? channel,
    String? role,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _communicationTemplatesRepository
          .watchCommunicationTemplates(
            category: category,
            channel: channel,
            role: role,
          )
          .listen((templates) {
        _templates = templates;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Seleccionar template
  void selectTemplate(Map<String, dynamic> template) {
    _selectedTemplate = template;
    notifyListeners();
  }

  // Crear template de comunicación
  Future<bool> createCommunicationTemplate(Map<String, dynamic> template) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _communicationTemplatesRepository.createCommunicationTemplate(template);
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

  // Actualizar template de comunicación
  Future<bool> updateCommunicationTemplate(String templateId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _communicationTemplatesRepository.updateCommunicationTemplate(
        templateId: templateId,
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

  // Eliminar template de comunicación
  Future<bool> deleteCommunicationTemplate(String templateId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _communicationTemplatesRepository.deleteCommunicationTemplate(templateId);
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

  // Procesar template con variables
  Future<Map<String, dynamic>?> processTemplate({
    required String templateId,
    required Map<String, dynamic> variables,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _communicationTemplatesRepository.processTemplate(
        templateId: templateId,
        variables: variables,
      );
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }
}


