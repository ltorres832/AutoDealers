// Repositorio de Customer Files - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class CustomerFilesRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener customer files (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchCustomerFiles({
    String? tenantId,
    String? customerId,
    String? sellerId,
    String? saleId,
    String? status,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('customer_files');

    if (customerId != null) {
      query = query.where('customerId', isEqualTo: customerId);
    }
    if (sellerId != null) {
      query = query.where('sellerId', isEqualTo: sellerId);
    }
    if (saleId != null) {
      query = query.where('saleId', isEqualTo: saleId);
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
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear customer file
  Future<Map<String, dynamic>> createCustomerFile({
    required String tenantId,
    required String saleId,
    required String customerId,
    required Map<String, dynamic> customerInfo,
    required String vehicleId,
    required String sellerId,
    Map<String, dynamic>? sellerInfo,
  }) async {
    try {
      final result = await _functions.httpsCallable('createCustomerFileFunction').call({
        'tenantId': tenantId,
        'saleId': saleId,
        'customerId': customerId,
        'customerInfo': customerInfo,
        'vehicleId': vehicleId,
        'sellerId': sellerId,
        'sellerInfo': sellerInfo,
      });

      return (result.data as Map<String, dynamic>)['customerFile'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear customer file: $e');
    }
  }

  // Obtener customer file por ID
  Future<Map<String, dynamic>?> getCustomerFileById({
    required String tenantId,
    required String fileId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getCustomerFileByIdFunction').call({
        'tenantId': tenantId,
        'fileId': fileId,
      });

      final data = result.data as Map<String, dynamic>;
      return data['customerFile'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener customer file: $e');
    }
  }

  // Obtener customer file por token
  Future<Map<String, dynamic>?> getCustomerFileByToken(String uploadToken) async {
    try {
      final result = await _functions.httpsCallable('getCustomerFileByTokenFunction').call({
        'uploadToken': uploadToken,
      });

      final data = result.data as Map<String, dynamic>;
      return data['customerFile'] as Map<String, dynamic>?;
    } catch (e) {
      throw Exception('Error al obtener customer file por token: $e');
    }
  }

  // Solicitar documento
  Future<Map<String, dynamic>> requestDocument({
    required String tenantId,
    required String fileId,
    required String documentName,
    required String documentType,
    required String requestedBy,
    String? description,
    bool required = true,
  }) async {
    try {
      final result = await _functions.httpsCallable('requestDocumentFunction').call({
        'tenantId': tenantId,
        'fileId': fileId,
        'documentName': documentName,
        'documentType': documentType,
        'description': description,
        'required': required,
        'requestedBy': requestedBy,
      });

      return (result.data as Map<String, dynamic>)['requestedDocument'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al solicitar documento: $e');
    }
  }

  // Agregar documento del cliente
  Future<Map<String, dynamic>> addCustomerDocument({
    required String tenantId,
    required String fileId,
    required Map<String, dynamic> document,
  }) async {
    try {
      final result = await _functions.httpsCallable('addCustomerDocumentFunction').call({
        'tenantId': tenantId,
        'fileId': fileId,
        'document': document,
      });

      return (result.data as Map<String, dynamic>)['document'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al agregar documento: $e');
    }
  }

  // Agregar evidencia
  Future<Map<String, dynamic>> addEvidence({
    required String tenantId,
    required String fileId,
    required Map<String, dynamic> evidence,
  }) async {
    try {
      final result = await _functions.httpsCallable('addEvidenceFunction').call({
        'tenantId': tenantId,
        'fileId': fileId,
        'evidence': evidence,
      });

      return (result.data as Map<String, dynamic>)['evidence'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al agregar evidencia: $e');
    }
  }
}


