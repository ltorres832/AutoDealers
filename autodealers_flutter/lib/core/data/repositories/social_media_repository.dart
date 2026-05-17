// Repositorio de Social Media - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class SocialMediaRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener posts (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchSocialPosts({
    String? tenantId,
    String? status,
    String? platform,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('social_posts');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }
    if (platform != null) {
      query = query.where('platform', isEqualTo: platform);
    }

    query = query.orderBy('createdAt', descending: true).limit(100);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'createdAt': data['createdAt']?.toDate(),
            'publishedAt': data['publishedAt']?.toDate(),
            'scheduledAt': data['scheduledAt']?.toDate(),
          };
        })
        .toList());
  }

  // Publicar en Facebook
  Future<Map<String, dynamic>> publishToFacebook({
    required String tenantId,
    required Map<String, dynamic> post,
  }) async {
    try {
      final result = await _functions.httpsCallable('publishToFacebook').call({
        'tenantId': tenantId,
        'post': post,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al publicar en Facebook: $e');
    }
  }

  // Publicar en Instagram
  Future<Map<String, dynamic>> publishToInstagram({
    required String tenantId,
    required Map<String, dynamic> post,
  }) async {
    try {
      final result = await _functions.httpsCallable('publishToInstagram').call({
        'tenantId': tenantId,
        'post': post,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al publicar en Instagram: $e');
    }
  }

  // Programar post
  Future<String> schedulePost({
    required String tenantId,
    required Map<String, dynamic> post,
    required DateTime scheduledAt,
  }) async {
    try {
      final result = await _functions.httpsCallable('schedulePost').call({
        'tenantId': tenantId,
        'post': post,
        'scheduledAt': scheduledAt.toIso8601String(),
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al programar post: $e');
    }
  }

  // Obtener posts
  Future<List<Map<String, dynamic>>> getSocialPosts({
    required String tenantId,
    String? status,
    String? platform,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getSocialPosts').call({
        'tenantId': tenantId,
        'status': status,
        'platform': platform,
        'limit': limit,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['posts'] as List);
    } catch (e) {
      throw Exception('Error al obtener posts: $e');
    }
  }

  // Pausar post programado
  Future<void> pauseScheduledPost({
    required String tenantId,
    required String postId,
  }) async {
    try {
      await _functions.httpsCallable('pauseScheduledPost').call({
        'tenantId': tenantId,
        'postId': postId,
      });
    } catch (e) {
      throw Exception('Error al pausar post: $e');
    }
  }
}


