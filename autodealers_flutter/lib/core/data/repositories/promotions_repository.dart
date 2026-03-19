// Repositorio de Promotions - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class PromotionsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener promociones (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchPromotions({
    String? tenantId,
    String? status,
    String? type,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('promotions');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }
    if (type != null) {
      query = query.where('type', isEqualTo: type);
    }

    query = query.orderBy('createdAt', descending: true).limit(100);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'startDate': data['startDate']?.toDate(),
            'endDate': data['endDate']?.toDate(),
            'paidAt': data['paidAt']?.toDate(),
            'expiresAt': data['expiresAt']?.toDate(),
            'createdAt': data['createdAt']?.toDate(),
            'updatedAt': data['updatedAt']?.toDate(),
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear promoción
  Future<Map<String, dynamic>> createPromotion({
    required String tenantId,
    required Map<String, dynamic> promotion,
  }) async {
    try {
      final result = await _functions.httpsCallable('createPromotionFunction').call({
        'promotion': promotion,
      });

      return (result.data as Map<String, dynamic>)['promotion'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear promoción: $e');
    }
  }

  // Obtener promociones activas
  Future<List<Map<String, dynamic>>> getActivePromotions(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getActivePromotionsFunction').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['promotions'] as List);
    } catch (e) {
      throw Exception('Error al obtener promociones activas: $e');
    }
  }

  // Obtener promociones
  Future<List<Map<String, dynamic>>> getPromotions({
    required String tenantId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getPromotionsFunction').call({
        'tenantId': tenantId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['promotions'] as List);
    } catch (e) {
      throw Exception('Error al obtener promociones: $e');
    }
  }

  // Actualizar promoción
  Future<void> updatePromotion({
    required String tenantId,
    required String promotionId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updatePromotion').call({
        'tenantId': tenantId,
        'promotionId': promotionId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar promoción: $e');
    }
  }

  // Activar promoción
  Future<void> activatePromotion({
    required String tenantId,
    required String promotionId,
  }) async {
    try {
      await _functions.httpsCallable('activatePromotion').call({
        'tenantId': tenantId,
        'promotionId': promotionId,
      });
    } catch (e) {
      throw Exception('Error al activar promoción: $e');
    }
  }

  // Pausar promoción
  Future<void> pausePromotion({
    required String tenantId,
    required String promotionId,
  }) async {
    try {
      await _functions.httpsCallable('pausePromotion').call({
        'tenantId': tenantId,
        'promotionId': promotionId,
      });
    } catch (e) {
      throw Exception('Error al pausar promoción: $e');
    }
  }

  // Eliminar promoción
  Future<void> deletePromotion({
    required String tenantId,
    required String promotionId,
  }) async {
    try {
      await _functions.httpsCallable('deletePromotion').call({
        'tenantId': tenantId,
        'promotionId': promotionId,
      });
    } catch (e) {
      throw Exception('Error al eliminar promoción: $e');
    }
  }

  // Enviar promoción a leads
  Future<void> sendPromotionToLeads({
    required String tenantId,
    required String promotionId,
  }) async {
    try {
      await _functions.httpsCallable('sendPromotionToLeadsFunction').call({
        'tenantId': tenantId,
        'promotionId': promotionId,
      });
    } catch (e) {
      throw Exception('Error al enviar promoción a leads: $e');
    }
  }
}


