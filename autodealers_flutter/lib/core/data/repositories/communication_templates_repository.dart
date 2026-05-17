// Repositorio de Communication Templates - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class CommunicationTemplatesRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener templates de comunicación (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchCommunicationTemplates({
    String? category,
    String? channel,
    String? role,
  }) {
    Query query = _firestore.collection('communication_templates');

    if (category != null) {
      query = query.where('category', isEqualTo: category);
    }

    if (channel != null) {
      query = query.where('channel', isEqualTo: channel);
    }

    if (role != null) {
      query = query.where('role', isEqualTo: role);
    }

    query = query.where('isActive', isEqualTo: true).orderBy('name', descending: false);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
              final data = doc.data() as Map<String, dynamic>;
              return {
                'id': doc.id,
                ...data,
                'createdAt': data['createdAt']?.toDate(),
                'updatedAt': data['updatedAt']?.toDate(),
              };
            })
        .toList());
  }

  // Obtener templates de comunicación
  Future<List<Map<String, dynamic>>> getCommunicationTemplates({
    String? category,
    String? channel,
    String? role,
  }) async {
    try {
      final result = await _functions.httpsCallable('getCommunicationTemplates').call({
        'category': category,
        'channel': channel,
        'role': role,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['templates'] as List);
    } catch (e) {
      throw Exception('Error al obtener templates de comunicación: $e');
    }
  }

  // Crear template de comunicación (solo admin)
  Future<String> createCommunicationTemplate(Map<String, dynamic> template) async {
    try {
      final result = await _functions.httpsCallable('createCommunicationTemplate').call(template);

      final data = result.data as Map<String, dynamic>;
      return (data['template'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear template de comunicación: $e');
    }
  }

  // Actualizar template de comunicación (solo admin)
  Future<void> updateCommunicationTemplate({
    required String templateId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateCommunicationTemplate').call({
        'templateId': templateId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar template de comunicación: $e');
    }
  }

  // Eliminar template de comunicación (solo admin)
  Future<void> deleteCommunicationTemplate(String templateId) async {
    try {
      await _functions.httpsCallable('deleteCommunicationTemplate').call({
        'templateId': templateId,
      });
    } catch (e) {
      throw Exception('Error al eliminar template de comunicación: $e');
    }
  }

  // Procesar template con variables
  Future<Map<String, dynamic>> processTemplate({
    required String templateId,
    required Map<String, dynamic> variables,
  }) async {
    try {
      final result = await _functions.httpsCallable('processTemplate').call({
        'templateId': templateId,
        'variables': variables,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al procesar template: $e');
    }
  }
}


