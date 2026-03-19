// Repositorio de Contracts - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class ContractsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener contratos (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchContracts({
    String? tenantId,
    String? saleId,
    String? leadId,
    String? status,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('contracts');

    if (saleId != null) {
      query = query.where('saleId', isEqualTo: saleId);
    }
    if (leadId != null) {
      query = query.where('leadId', isEqualTo: leadId);
    }
    if (status != null) {
      query = query.where('status', isEqualTo: status);
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
            'completedAt': data['completedAt']?.toDate(),
            'sentForSignatureAt': data['sentForSignatureAt']?.toDate(),
            'signedAt': data['signedAt']?.toDate(),
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear contrato
  Future<String> createContract({
    required String tenantId,
    required Map<String, dynamic> contract,
  }) async {
    try {
      final result = await _functions.httpsCallable('createContract').call({
        'tenantId': tenantId,
        'contract': contract,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear contrato: $e');
    }
  }

  // Obtener contratos
  Future<List<Map<String, dynamic>>> getContracts({
    required String tenantId,
    String? saleId,
    String? leadId,
    String? status,
  }) async {
    try {
      final result = await _functions.httpsCallable('getContracts').call({
        'tenantId': tenantId,
        'saleId': saleId,
        'leadId': leadId,
        'status': status,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['contracts'] as List);
    } catch (e) {
      throw Exception('Error al obtener contratos: $e');
    }
  }

  // Actualizar contrato
  Future<void> updateContract({
    required String tenantId,
    required String contractId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _functions.httpsCallable('updateContract').call({
        'tenantId': tenantId,
        'contractId': contractId,
        'updates': updates,
      });
    } catch (e) {
      throw Exception('Error al actualizar contrato: $e');
    }
  }

  // Enviar para firma
  Future<void> sendForSignature({
    required String tenantId,
    required String contractId,
  }) async {
    try {
      await _functions.httpsCallable('sendForSignature').call({
        'tenantId': tenantId,
        'contractId': contractId,
      });
    } catch (e) {
      throw Exception('Error al enviar para firma: $e');
    }
  }

  // Firmar contrato
  Future<void> signContract({
    required String tenantId,
    required String contractId,
    required Map<String, dynamic> signature,
  }) async {
    try {
      await _functions.httpsCallable('signContract').call({
        'tenantId': tenantId,
        'contractId': contractId,
        'signature': signature,
      });
    } catch (e) {
      throw Exception('Error al firmar contrato: $e');
    }
  }

  // Digitalizar contrato
  Future<void> digitalizeContract({
    required String tenantId,
    required String contractId,
  }) async {
    try {
      await _functions.httpsCallable('digitalizeContract').call({
        'tenantId': tenantId,
        'contractId': contractId,
      });
    } catch (e) {
      throw Exception('Error al digitalizar contrato: $e');
    }
  }

  // Eliminar contrato/plantilla (borrado en Firestore)
  Future<void> deleteContract({
    required String tenantId,
    required String contractId,
  }) async {
    try {
      await _firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('contracts')
          .doc(contractId)
          .delete();
    } catch (e) {
      throw Exception('Error al eliminar contrato: $e');
    }
  }
}


