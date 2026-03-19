// Repositorio de Ventas - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/sale.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class SalesRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener ventas del tenant
  Stream<List<Sale>> watchSales({
    String? tenantId,
    String? leadId,
    String? sellerId,
    String? vehicleId,
    SaleStatus? status,
  }) {
    Query query = _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('sales');

    if (leadId != null) {
      query = query.where('leadId', isEqualTo: leadId);
    }
    if (sellerId != null) {
      query = query.where('sellerId', isEqualTo: sellerId);
    }
    if (vehicleId != null) {
      query = query.where('vehicleId', isEqualTo: vehicleId);
    }
    if (status != null) {
      query = query.where('status', isEqualTo: status.name);
    }

    query = query.orderBy('createdAt', descending: true);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) => Sale.fromJson({
              'id': doc.id,
              ...doc.data() as Map<String, dynamic>,
            }))
        .toList());
  }

  // Crear venta
  Future<String> createSale(Sale sale, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    final docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('sales')
        .doc();

    final data = sale.toJson();
    data.remove('id');

    await docRef.set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  // Actualizar venta
  Future<void> updateSale(
    String saleId,
    Map<String, dynamic> updates, {
    String? tenantId,
  }) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('sales')
        .doc(saleId)
        .update(updates);
  }

  // Marcar venta como completada
  Future<void> completeSale(String saleId, {String? tenantId}) async {
    await updateSale(
      saleId,
      {
        'status': SaleStatus.completed.name,
        'completedAt': FieldValue.serverTimestamp(),
      },
      tenantId: tenantId,
    );
  }
}


