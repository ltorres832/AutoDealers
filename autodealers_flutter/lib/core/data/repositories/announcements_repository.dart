// Repositorio de Announcements - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class AnnouncementsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener anuncios (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchAnnouncements({
    String? tenantId,
    bool? activeOnly,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('announcements')
        .orderBy('createdAt', descending: true);

    if (activeOnly == true) {
      query = query.where('isActive', isEqualTo: true);
    }

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'startDate': data['startDate']?.toDate(),
            'endDate': data['endDate']?.toDate(),
            'createdAt': data['createdAt']?.toDate(),
            'updatedAt': data['updatedAt']?.toDate(),
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear anuncio
  Future<String> createAnnouncement({
    required String tenantId,
    required Map<String, dynamic> announcement,
    bool sendNotifications = true,
  }) async {
    try {
      final result = await _functions.httpsCallable('createAnnouncement').call({
        'tenantId': tenantId,
        'announcement': announcement,
        'sendNotifications': sendNotifications,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear anuncio: $e');
    }
  }

  // Obtener anuncios activos
  Future<List<Map<String, dynamic>>> getActiveAnnouncements({
    required String tenantId,
    String? userId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getActiveAnnouncements').call({
        'tenantId': tenantId,
        'userId': userId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['announcements'] as List);
    } catch (e) {
      throw Exception('Error al obtener anuncios activos: $e');
    }
  }

  // Descartar anuncio
  Future<void> dismissAnnouncement({
    required String tenantId,
    required String announcementId,
  }) async {
    try {
      await _functions.httpsCallable('dismissAnnouncement').call({
        'tenantId': tenantId,
        'announcementId': announcementId,
      });
    } catch (e) {
      throw Exception('Error al descartar anuncio: $e');
    }
  }

  // Actualizar anuncio
  Future<void> updateAnnouncement({
    required String tenantId,
    required String announcementId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateAnnouncement').call({
        'tenantId': tenantId,
        'announcementId': announcementId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar anuncio: $e');
    }
  }

  // Eliminar anuncio
  Future<void> deleteAnnouncement({
    required String tenantId,
    required String announcementId,
  }) async {
    try {
      await _functions.httpsCallable('deleteAnnouncement').call({
        'tenantId': tenantId,
        'announcementId': announcementId,
      });
    } catch (e) {
      throw Exception('Error al eliminar anuncio: $e');
    }
  }
}


