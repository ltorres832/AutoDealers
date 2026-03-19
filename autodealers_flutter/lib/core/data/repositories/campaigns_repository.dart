// Repositorio de Campaigns - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class CampaignsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener campañas (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchCampaigns({
    String? tenantId,
    String? status,
    String? platform,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('campaigns');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    query = query.orderBy('createdAt', descending: true).limit(100);

    return query.snapshots().map((snapshot) {
      var campaigns = snapshot.docs
          .map((doc) {
                final data = doc.data() as Map<String, dynamic>;
                return {
                  'id': doc.id,
                  ...data,
                  'createdAt': data['createdAt']?.toDate(),
                  'updatedAt': data['updatedAt']?.toDate(),
                  'startedAt': data['startedAt']?.toDate(),
                  'completedAt': data['completedAt']?.toDate(),
                } as Map<String, dynamic>;
              })
          .toList();

      // Filtrar por plataforma si se especifica
      if (platform != null) {
        campaigns = campaigns.where((c) {
          final platforms = c['platforms'] as List?;
          return platforms?.contains(platform) ?? false;
        }).toList();
      }

      return campaigns;
    });
  }

  // Obtener campañas
  Future<List<Map<String, dynamic>>> getCampaigns({
    required String tenantId,
    String? status,
    String? platform,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getCampaigns').call({
        'tenantId': tenantId,
        'status': status,
        'platform': platform,
        'limit': limit,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['campaigns'] as List);
    } catch (e) {
      throw Exception('Error al obtener campañas: $e');
    }
  }

  // Crear campaña
  Future<String> createCampaign({
    required String tenantId,
    required Map<String, dynamic> campaign,
  }) async {
    try {
      final result = await _functions.httpsCallable('createCampaign').call({
        'tenantId': tenantId,
        ...campaign,
      });

      final data = result.data as Map<String, dynamic>;
      return (data['campaign'] as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear campaña: $e');
    }
  }

  // Actualizar campaña
  Future<void> updateCampaign({
    required String tenantId,
    required String campaignId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateCampaign').call({
        'tenantId': tenantId,
        'campaignId': campaignId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar campaña: $e');
    }
  }

  // Eliminar campaña
  Future<void> deleteCampaign({
    required String tenantId,
    required String campaignId,
  }) async {
    try {
      await _functions.httpsCallable('deleteCampaign').call({
        'tenantId': tenantId,
        'campaignId': campaignId,
      });
    } catch (e) {
      throw Exception('Error al eliminar campaña: $e');
    }
  }
}


