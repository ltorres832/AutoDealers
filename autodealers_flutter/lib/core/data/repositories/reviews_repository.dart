// Repositorio de Reviews - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class ReviewsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener reviews (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchReviews({
    String? tenantId,
    String? status,
    String? sellerId,
    String? vehicleId,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('reviews');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }
    if (sellerId != null) {
      query = query.where('sellerId', isEqualTo: sellerId);
    }
    if (vehicleId != null) {
      query = query.where('vehicleId', isEqualTo: vehicleId);
    }

    query = query.orderBy('createdAt', descending: true).limit(100);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'createdAt': data['createdAt']?.toDate(),
            'updatedAt': data['updatedAt']?.toDate(),
            'approvedAt': data['approvedAt']?.toDate(),
            'respondedAt': data['respondedAt']?.toDate(),
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear review
  Future<String> createReview({
    required String tenantId,
    required Map<String, dynamic> review,
  }) async {
    try {
      final result = await _functions.httpsCallable('createReview').call({
        'tenantId': tenantId,
        'review': review,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear review: $e');
    }
  }

  // Obtener reviews
  Future<List<Map<String, dynamic>>> getReviews({
    required String tenantId,
    String? status,
    String? sellerId,
    String? vehicleId,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getReviews').call({
        'tenantId': tenantId,
        'status': status,
        'sellerId': sellerId,
        'vehicleId': vehicleId,
        'limit': limit,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['reviews'] as List);
    } catch (e) {
      throw Exception('Error al obtener reviews: $e');
    }
  }

  // Actualizar review
  Future<void> updateReview({
    required String tenantId,
    required String reviewId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateReview').call({
        'tenantId': tenantId,
        'reviewId': reviewId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar review: $e');
    }
  }

  // Aprobar review
  Future<void> approveReview({
    required String tenantId,
    required String reviewId,
  }) async {
    try {
      await _functions.httpsCallable('approveReview').call({
        'tenantId': tenantId,
        'reviewId': reviewId,
      });
    } catch (e) {
      throw Exception('Error al aprobar review: $e');
    }
  }

  // Responder review
  Future<void> respondToReview({
    required String tenantId,
    required String reviewId,
    required String response,
  }) async {
    try {
      await _functions.httpsCallable('respondToReview').call({
        'tenantId': tenantId,
        'reviewId': reviewId,
        'response': response,
      });
    } catch (e) {
      throw Exception('Error al responder review: $e');
    }
  }
}


