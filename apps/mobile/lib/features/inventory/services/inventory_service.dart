import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/vehicle.dart';
import '../../../core/models/user_role.dart';

/// Servicio para gestión de Inventario
class InventoryService {
  final FirestoreService _firestore = FirestoreService();
  final AuthService _auth = AuthService();

  /// Obtiene todos los vehículos con sincronización en tiempo real
  Stream<List<Vehicle>> watchVehicles({
    String? status,
    String? make,
    String? model,
  }) async* {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) return;

    Query query = FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    if (make != null) {
      query = query.where('make', isEqualTo: make);
    }

    query = query.orderBy('createdAt', descending: true);

    await for (final snapshot in query.snapshots()) {
      yield snapshot.docs.map((doc) {
        return Vehicle.fromFirestore(doc.data(), doc.id);
      }).toList();
    }
  }

  /// Obtiene un vehículo por ID
  Stream<Vehicle?> watchVehicle(String vehicleId) async* {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) {
      yield null;
      return;
    }

    await for (final doc in FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .snapshots()) {
      if (!doc.exists) {
        yield null;
      } else {
        yield Vehicle.fromFirestore(doc.data()!, doc.id);
      }
    }
  }

  /// Crea un nuevo vehículo
  Future<String> createVehicle({
    required String make,
    required String model,
    required int year,
    required double price,
    String? color,
    String? vin,
    String? plate,
    String? description,
    List<String> photos = const [],
    Map<String, dynamic>? specifications,
  }) async {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    return await _firestore.create(
      collection: 'vehicles',
      data: {
        'tenantId': tenantId,
        'make': make,
        'model': model,
        'year': year,
        'color': color,
        'vin': vin,
        'plate': plate,
        'price': price,
        'status': 'available',
        'description': description,
        'photos': photos,
        'specifications': specifications ?? {},
      },
    );
  }

  /// Actualiza un vehículo
  Future<void> updateVehicle(String vehicleId, Map<String, dynamic> updates) async {
    await _firestore.update(
      collection: 'vehicles',
      documentId: vehicleId,
      data: updates,
    );
  }

  /// Marca un vehículo como vendido
  Future<void> markAsSold(String vehicleId) async {
    await updateVehicle(vehicleId, {'status': 'sold'});
  }

  /// Elimina un vehículo
  Future<void> deleteVehicle(String vehicleId) async {
    await _firestore.delete(
      collection: 'vehicles',
      documentId: vehicleId,
    );
  }
}


