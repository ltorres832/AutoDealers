// Repositorio de FAQs - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class FAQsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener FAQs (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchFAQs({
    String? tenantId,
    bool activeOnly = true,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('faqs');

    if (activeOnly) {
      query = query.where('isActive', isEqualTo: true);
    }

    query = query.orderBy('order', descending: false);

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

  // Obtener FAQs
  Future<List<Map<String, dynamic>>> getFAQs({
    required String tenantId,
    bool activeOnly = true,
  }) async {
    try {
      final result = await _functions.httpsCallable('getFAQs').call({
        'tenantId': tenantId,
        'activeOnly': activeOnly,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['faqs'] as List);
    } catch (e) {
      throw Exception('Error al obtener FAQs: $e');
    }
  }

  // Crear FAQ
  Future<String> createFAQ({
    required String tenantId,
    required Map<String, dynamic> faq,
  }) async {
    try {
      final result = await _functions.httpsCallable('createFAQ').call({
        'tenantId': tenantId,
        ...faq,
      });

      final data = result.data as Map<String, dynamic>;
      return (data['faq'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear FAQ: $e');
    }
  }

  // Actualizar FAQ
  Future<void> updateFAQ({
    required String tenantId,
    required String faqId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateFAQ').call({
        'tenantId': tenantId,
        'faqId': faqId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar FAQ: $e');
    }
  }

  // Eliminar FAQ
  Future<void> deleteFAQ({
    required String tenantId,
    required String faqId,
  }) async {
    try {
      await _functions.httpsCallable('deleteFAQ').call({
        'tenantId': tenantId,
        'faqId': faqId,
      });
    } catch (e) {
      throw Exception('Error al eliminar FAQ: $e');
    }
  }
}


