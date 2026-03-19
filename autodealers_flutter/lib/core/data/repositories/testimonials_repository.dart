// Repositorio de Testimonials - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class TestimonialsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener testimonials (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchTestimonials({bool activeOnly = true}) {
    Query query = _firestore.collection('testimonials');

    if (activeOnly) {
      query = query.where('isActive', isNotEqualTo: false);
    }

    query = query.orderBy('order', descending: false).limit(50);

    return query.snapshots().map((snapshot) {
      final testimonials = snapshot.docs
          .map((doc) {
                final data = doc.data() as Map<String, dynamic>;
                return {
                  'id': doc.id,
                  ...data,
                } as Map<String, dynamic>;
              })
          .where((t) => t['isActive'] != false)
          .toList();
      testimonials.sort((a, b) => (a['order'] ?? 0).compareTo(b['order'] ?? 0));
      return testimonials;
    });
  }

  // Obtener testimonials
  Future<List<Map<String, dynamic>>> getTestimonials({bool activeOnly = true}) async {
    try {
      final result = await _functions.httpsCallable('getTestimonials').call({
        'activeOnly': activeOnly,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['testimonials'] as List);
    } catch (e) {
      throw Exception('Error al obtener testimonials: $e');
    }
  }

  // Crear testimonial (solo admin)
  Future<String> createTestimonial(Map<String, dynamic> testimonial) async {
    try {
      final result = await _functions.httpsCallable('createTestimonial').call(testimonial);

      final data = result.data as Map<String, dynamic>;
      return (data['testimonial'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear testimonial: $e');
    }
  }

  // Actualizar testimonial (solo admin)
  Future<void> updateTestimonial({
    required String testimonialId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateTestimonial').call({
        'testimonialId': testimonialId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar testimonial: $e');
    }
  }

  // Eliminar testimonial (solo admin)
  Future<void> deleteTestimonial(String testimonialId) async {
    try {
      await _functions.httpsCallable('deleteTestimonial').call({
        'testimonialId': testimonialId,
      });
    } catch (e) {
      throw Exception('Error al eliminar testimonial: $e');
    }
  }
}


