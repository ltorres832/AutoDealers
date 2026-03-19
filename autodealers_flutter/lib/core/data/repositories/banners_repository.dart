// Repositorio de Banners - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class BannersRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener banners (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchBanners({
    String? tenantId,
    String? status,
    bool? approved,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('premium_banners');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }
    if (approved != null) {
      query = query.where('approved', isEqualTo: approved);
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
            'expiresAt': data['expiresAt']?.toDate(),
            'approvedAt': data['approvedAt']?.toDate(),
            'rejectedAt': data['rejectedAt']?.toDate(),
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear banner
  Future<String> createBanner({
    required String tenantId,
    required Map<String, dynamic> banner,
  }) async {
    try {
      final result = await _functions.httpsCallable('createBanner').call({
        'tenantId': tenantId,
        'banner': banner,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear banner: $e');
    }
  }

  // Obtener banners
  Future<List<Map<String, dynamic>>> getBanners({
    required String tenantId,
    String? status,
    bool? approved,
  }) async {
    try {
      final result = await _functions.httpsCallable('getBanners').call({
        'tenantId': tenantId,
        'status': status,
        'approved': approved,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['banners'] as List);
    } catch (e) {
      throw Exception('Error al obtener banners: $e');
    }
  }

  // Obtener banners públicos
  Future<List<Map<String, dynamic>>> getPublicBanners() async {
    try {
      final result = await _functions.httpsCallable('getPublicBanners').call();

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['banners'] as List);
    } catch (e) {
      throw Exception('Error al obtener banners públicos: $e');
    }
  }

  // Aprobar banner (admin)
  Future<void> approveBanner({
    required String tenantId,
    required String bannerId,
  }) async {
    try {
      await _functions.httpsCallable('approveBanner').call({
        'tenantId': tenantId,
        'bannerId': bannerId,
      });
    } catch (e) {
      throw Exception('Error al aprobar banner: $e');
    }
  }

  // Rechazar banner (admin)
  Future<void> rejectBanner({
    required String tenantId,
    required String bannerId,
    String? reason,
  }) async {
    try {
      await _functions.httpsCallable('rejectBanner').call({
        'tenantId': tenantId,
        'bannerId': bannerId,
        'reason': reason,
      });
    } catch (e) {
      throw Exception('Error al rechazar banner: $e');
    }
  }

  // Registrar click en banner
  Future<void> recordBannerClick({
    required String tenantId,
    required String bannerId,
  }) async {
    try {
      await _functions.httpsCallable('recordBannerClick').call({
        'tenantId': tenantId,
        'bannerId': bannerId,
      });
    } catch (e) {
      throw Exception('Error al registrar click: $e');
    }
  }
}


