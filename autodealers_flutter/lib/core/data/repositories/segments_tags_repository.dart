// Repositorio de Segments & Tags - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class SegmentsTagsRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // ==================== Segments ====================

  Future<List<Map<String, dynamic>>> getSegments(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getSegments').call({
        'tenantId': tenantId,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['segments'] as List);
    } catch (e) {
      throw Exception('Error al obtener segmentos: $e');
    }
  }

  Future<Map<String, dynamic>> createSegment({
    required String tenantId,
    required Map<String, dynamic> segment,
  }) async {
    try {
      final result = await _functions.httpsCallable('createSegment').call({
        'tenantId': tenantId,
        'segment': segment,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear segmento: $e');
    }
  }

  Future<Map<String, dynamic>> updateSegment({
    required String tenantId,
    required String segmentId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final result = await _functions.httpsCallable('updateSegment').call({
        'tenantId': tenantId,
        'segmentId': segmentId,
        'updates': updates,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar segmento: $e');
    }
  }

  Future<bool> deleteSegment({
    required String tenantId,
    required String segmentId,
  }) async {
    try {
      await _functions.httpsCallable('deleteSegment').call({
        'tenantId': tenantId,
        'segmentId': segmentId,
      });
      return true;
    } catch (e) {
      throw Exception('Error al eliminar segmento: $e');
    }
  }

  // ==================== Tags ====================

  Future<List<Map<String, dynamic>>> getTags(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getTags').call({
        'tenantId': tenantId,
      });
      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['tags'] as List);
    } catch (e) {
      throw Exception('Error al obtener tags: $e');
    }
  }

  Future<Map<String, dynamic>> createTag({
    required String tenantId,
    required Map<String, dynamic> tag,
  }) async {
    try {
      final result = await _functions.httpsCallable('createTag').call({
        'tenantId': tenantId,
        'tag': tag,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear tag: $e');
    }
  }

  Future<Map<String, dynamic>> updateTag({
    required String tenantId,
    required String tagId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      final result = await _functions.httpsCallable('updateTag').call({
        'tenantId': tenantId,
        'tagId': tagId,
        'updates': updates,
      });
      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar tag: $e');
    }
  }

  Future<bool> deleteTag({
    required String tenantId,
    required String tagId,
  }) async {
    try {
      await _functions.httpsCallable('deleteTag').call({
        'tenantId': tenantId,
        'tagId': tagId,
      });
      return true;
    } catch (e) {
      throw Exception('Error al eliminar tag: $e');
    }
  }
}


