// Repositorio de Inventario - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/vehicle.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class InventoryRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;

  final FirestoreService _firestoreService = FirestoreService();

  // Obtener tenantId actual (helper)
  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  /// Vehículos de todos los tenants (catálogo público). Carga leyendo cada tenant para no depender de índices.
  Stream<List<Vehicle>> watchPublicVehicles({
    VehicleStatus? status,
    int? limit,
  }) {
    final effectiveStatus = status ?? VehicleStatus.available;
    return Stream.fromFuture(
      loadPublicVehiclesByTenants(status: effectiveStatus, limit: limit ?? 500),
    );
  }

  /// Carga vehículos públicos leyendo cada tenant (tenants → vehicles con status available).
  Future<List<Vehicle>> loadPublicVehiclesByTenants({
    VehicleStatus status = VehicleStatus.available,
    int limit = 500,
  }) async {
    final tenantsSnap = await _firestore.collection('tenants').get();
    final all = <Vehicle>[];
    for (final tenantDoc in tenantsSnap.docs) {
      final tenantId = tenantDoc.id;
      final snap = await _firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .where('status', isEqualTo: status.name)
          .limit(150)
          .get();
      for (final doc in snap.docs) {
        try {
          all.add(Vehicle.fromJson({
            'id': doc.id,
            'tenantId': tenantId,
            ...doc.data(),
          }));
        } catch (_) {
          // Si un documento falla al parsear, lo saltamos
        }
      }
    }
    all.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return all.take(limit).toList();
  }

  // Obtener vehículos del tenant
  Stream<List<Vehicle>> watchVehicles({
    String? tenantId,
    VehicleStatus? status,
    VehicleCondition? condition,
    String? make,
    String? model,
    int? minYear,
    int? maxYear,
    double? minPrice,
    double? maxPrice,
    VehicleBodyType? bodyType,
    int? limit,
  }) {
    Query query = _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('vehicles');

    if (status != null) {
      query = query.where('status', isEqualTo: status.name);
    }
    if (condition != null) {
      query = query.where('condition', isEqualTo: condition.name.replaceAll('_', ''));
    }
    if (make != null) {
      query = query.where('make', isEqualTo: make);
    }
    if (model != null) {
      query = query.where('model', isEqualTo: model);
    }
    if (bodyType != null) {
      query = query.where('bodyType', isEqualTo: bodyType.name.replaceAll('_', '-'));
    }

    query = query.orderBy('createdAt', descending: true);

    if (limit != null) {
      query = query.limit(limit);
    }

    return query.snapshots().map((snapshot) {
      var vehicles = snapshot.docs
          .map((doc) => Vehicle.fromJson({
                'id': doc.id,
                ...doc.data() as Map<String, dynamic>,
              }))
          .toList();

      // Filtrar por precio y año en memoria (ya que Firestore no soporta múltiples rangos)
      if (minYear != null) {
        vehicles = vehicles.where((v) => v.year >= minYear).toList();
      }
      if (maxYear != null) {
        vehicles = vehicles.where((v) => v.year <= maxYear).toList();
      }
      if (minPrice != null) {
        vehicles = vehicles.where((v) => v.price >= minPrice).toList();
      }
      if (maxPrice != null) {
        vehicles = vehicles.where((v) => v.price <= maxPrice).toList();
      }

      return vehicles;
    });
  }

  /// Obtener un vehículo una vez (para comparar, etc.)
  Future<Vehicle?> getVehicle(String vehicleId, {String? tenantId}) async {
    if (tenantId == null || tenantId.isEmpty) return null;
    final doc = await _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .get();
    if (!doc.exists) return null;
    return Vehicle.fromJson({
      'id': doc.id,
      ...doc.data() as Map<String, dynamic>,
    });
  }

  // Obtener un vehículo específico
  Stream<Vehicle?> watchVehicle(String vehicleId, {String? tenantId}) {
    return _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('vehicles')
        .doc(vehicleId)
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      return Vehicle.fromJson({
        'id': doc.id,
        ...doc.data() as Map<String, dynamic>,
      });
    });
  }

  // Crear un nuevo vehículo
  Future<String> createVehicle(Vehicle vehicle, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    final docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('vehicles')
        .doc();

    final data = vehicle.toJson();
    data.remove('id');

    await docRef.set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  // Actualizar un vehículo
  Future<void> updateVehicle(String vehicleId, Map<String, dynamic> updates, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .update({
      ...updates,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Eliminar un vehículo
  Future<void> deleteVehicle(String vehicleId, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('vehicles')
        .doc(vehicleId)
        .delete();
  }

  // Marcar vehículo como vendido
  Future<void> markAsSold(String vehicleId, {String? tenantId}) async {
    await updateVehicle(vehicleId, {
      'status': VehicleStatus.sold.name,
      'soldAt': FieldValue.serverTimestamp(),
    }, tenantId: tenantId);
  }

  // Publicar/despublicar vehículo en página pública
  Future<void> togglePublicPage(String vehicleId, bool published, {String? tenantId}) async {
    await updateVehicle(vehicleId, {
      'publishedOnPublicPage': published,
    }, tenantId: tenantId);
  }
}
