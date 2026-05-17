// Repositorio de Templates - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class TemplatesRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  // Obtener templates (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchTemplates({
    String? type,
    String? role,
  }) {
    Query query = _firestore.collection('templates');

    if (type != null) {
      query = query.where('type', isEqualTo: type);
    }

    return query.snapshots().map((snapshot) {
      var templates = snapshot.docs
          .map((doc) {
            final data = doc.data() as Map<String, dynamic>;
            return {
              'id': doc.id,
              ...data,
              'createdAt': data['createdAt']?.toDate(),
              'updatedAt': data['updatedAt']?.toDate(),
            };
          })
          .toList();

      // Filtrar por rol si es necesario
      if (role != null && role != 'all') {
        templates = templates.where((t) => t['role'] == role || t['role'] == 'all').toList();
      }

      // Ordenar por nombre
      templates.sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));

      return templates;
    });
  }

  // Crear template
  Future<Map<String, dynamic>> createTemplate({
    required Map<String, dynamic> template,
    String? tenantId,
  }) async {
    try {
      final result = await _functions.httpsCallable('createTemplateFunction').call({
        'template': template,
        'tenantId': tenantId,
      });

      return (result.data as Map<String, dynamic>)['template'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear template: $e');
    }
  }

  // Obtener template por ID
  Future<Map<String, dynamic>?> getTemplateById(String templateId) async {
    try {
      final result = await _functions.httpsCallable('getTemplateByIdFunction').call({
        'templateId': templateId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['template'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener template: $e');
    }
  }

  // Obtener templates
  Future<List<Map<String, dynamic>>> getTemplates({String? type, String? role}) async {
    try {
      final result = await _functions.httpsCallable('getTemplatesFunction').call({
        'type': type,
        'role': role,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['templates'] as List);
    } catch (e) {
      throw Exception('Error al obtener templates: $e');
    }
  }

  // Actualizar template
  Future<void> updateTemplate({
    required String templateId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateTemplateFunction').call({
        'templateId': templateId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar template: $e');
    }
  }

  // Eliminar template
  Future<void> deleteTemplate(String templateId) async {
    try {
      await _functions.httpsCallable('deleteTemplateFunction').call({
        'templateId': templateId,
      });
    } catch (e) {
      throw Exception('Error al eliminar template: $e');
    }
  }

  // Procesar template con variables
  Future<Map<String, dynamic>> processTemplate({
    required Map<String, dynamic> template,
    required Map<String, String> variables,
  }) async {
    try {
      final result = await _functions.httpsCallable('processTemplateFunction').call({
        'template': template,
        'variables': variables,
      });

      return (result.data as Map<String, dynamic>)['result'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al procesar template: $e');
    }
  }

  // Obtener template por defecto
  Future<Map<String, dynamic>?> getDefaultTemplate({
    required String type,
    required String role,
  }) async {
    try {
      final result = await _functions.httpsCallable('getDefaultTemplateFunction').call({
        'type': type,
        'role': role,
      });

      final data = result.data as Map<String, dynamic>;
      return data['template'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener template por defecto: $e');
    }
  }
}


