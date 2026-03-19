// Provider de Templates - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/templates_repository.dart';

class TemplatesProvider extends ChangeNotifier {
  final TemplatesRepository _templatesRepository = TemplatesRepository();

  List<Map<String, dynamic>> _templates = [];
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get templates => _templates;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar templates (stream en tiempo real)
  Future<void> loadTemplates({String? type, String? role}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _templatesRepository.watchTemplates(type: type, role: role).listen((templates) {
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

  // Crear template
  Future<bool> createTemplate({
    required Map<String, dynamic> template,
    String? tenantId,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _templatesRepository.createTemplate(template: template, tenantId: tenantId);
      await loadTemplates();
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

  // Actualizar template
  Future<bool> updateTemplate({
    required String templateId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _templatesRepository.updateTemplate(templateId: templateId, updates: updates);
      await loadTemplates();
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

  // Eliminar template
  Future<bool> deleteTemplate(String templateId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _templatesRepository.deleteTemplate(templateId);
      await loadTemplates();
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
    required Map<String, dynamic> template,
    required Map<String, String> variables,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _templatesRepository.processTemplate(
        template: template,
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


