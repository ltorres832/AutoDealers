import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/sale.dart';
import '../../../core/models/user_role.dart';

/// Servicio para gestión de Ventas
class SalesService {
  final FirestoreService _firestore = FirestoreService();
  final AuthService _auth = AuthService();

  /// Obtiene todas las ventas con sincronización en tiempo real
  Stream<List<Sale>> watchSales({
    String? status,
    String? sellerId,
    DateTime? startDate,
    DateTime? endDate,
  }) async* {
    final permissions = await _auth.getPermissions();
    if (permissions == null) return;

    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) return;

    Query query = FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('sales');

    // Filtros según rol
    if (permissions.role == UserRole.seller) {
      final user = _auth.currentUser;
      if (user != null) {
        query = query.where('sellerId', isEqualTo: user.uid);
      }
    } else if (sellerId != null) {
      query = query.where('sellerId', isEqualTo: sellerId);
    }

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    if (startDate != null) {
      query = query.where('createdAt',
          isGreaterThanOrEqualTo: Timestamp.fromDate(startDate));
    }

    if (endDate != null) {
      query = query.where('createdAt',
          isLessThanOrEqualTo: Timestamp.fromDate(endDate));
    }

    query = query.orderBy('createdAt', descending: true);

    await for (final snapshot in query.snapshots()) {
      yield snapshot.docs.map((doc) {
        return Sale.fromFirestore(doc.data(), doc.id);
      }).toList();
    }
  }

  /// Obtiene estadísticas de ventas
  Future<Map<String, dynamic>> getSalesStats({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final permissions = await _auth.getPermissions();
    if (permissions == null) throw Exception('No autorizado');

    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    Query query = FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .where('status', isEqualTo: 'completed');

    if (permissions.role == UserRole.seller) {
      final user = _auth.currentUser;
      if (user != null) {
        query = query.where('sellerId', isEqualTo: user.uid);
      }
    }

    if (startDate != null) {
      query = query.where('createdAt',
          isGreaterThanOrEqualTo: Timestamp.fromDate(startDate));
    }

    if (endDate != null) {
      query = query.where('createdAt',
          isLessThanOrEqualTo: Timestamp.fromDate(endDate));
    }

    final snapshot = await query.get();

    double totalRevenue = 0;
    int totalSales = snapshot.size;

    for (final doc in snapshot.docs) {
      final data = doc.data();
      totalRevenue +=
          ((data['salePrice'] ?? data['total'] ?? 0) as num).toDouble();
    }

    return {
      'totalSales': totalSales,
      'totalRevenue': totalRevenue,
      'averageSale': totalSales > 0 ? totalRevenue / totalSales : 0,
    };
  }

  /// Crea una nueva venta
  Future<String> createSale({
    required String vehicleId,
    required double salePrice,
    String? leadId,
    String? sellerId,
    SaleBuyer? buyer,
    bool enableReminders = false,
    List<String>? selectedReminders,
  }) async {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    final permissions = await _auth.getPermissions();
    final currentUserId = _auth.currentUser?.uid;

    return await _firestore.create(
      collection: 'sales',
      data: {
        'tenantId': tenantId,
        'vehicleId': vehicleId,
        'leadId': leadId,
        'sellerId': sellerId ?? (permissions?.role == UserRole.seller ? currentUserId : null),
        'salePrice': salePrice,
        'saleDate': DateTime.now().toIso8601String(),
        'status': 'completed',
        'buyer': buyer?.toMap(),
        'enableReminders': enableReminders,
        'selectedReminders': selectedReminders,
      },
    );
  }

  /// Obtiene una venta por ID
  Stream<Sale?> watchSale(String saleId) async* {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) {
      yield null;
      return;
    }

    await for (final doc in FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .doc(saleId)
        .snapshots()) {
      if (!doc.exists) {
        yield null;
      } else {
        yield Sale.fromFirestore(doc.data()!, doc.id);
      }
    }
  }
}


