// Repository de Administración - Data Layer
import 'package:cloud_functions/cloud_functions.dart';

class AdminRepository {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Usuarios
  Future<List<Map<String, dynamic>>> getAllUsers() async {
    try {
      final callable = _functions.httpsCallable('getAllUsers');
      final result = await callable();
      return List<Map<String, dynamic>>.from(result.data['users'] ?? []);
    } catch (e) {
      throw Exception('Error al obtener usuarios: $e');
    }
  }

  Future<Map<String, dynamic>> getUserById(String userId) async {
    try {
      final callable = _functions.httpsCallable('getUserById');
      final result = await callable({'userId': userId});
      return Map<String, dynamic>.from(result.data ?? {});
    } catch (e) {
      throw Exception('Error al obtener usuario: $e');
    }
  }

  Future<void> updateUser(String userId, Map<String, dynamic> updates) async {
    try {
      final callable = _functions.httpsCallable('updateUser');
      await callable({'userId': userId, 'updates': updates});
    } catch (e) {
      throw Exception('Error al actualizar usuario: $e');
    }
  }

  Future<void> updateUserStatus(String userId, String status) async {
    try {
      final callable = _functions.httpsCallable('updateUserStatus');
      await callable({'userId': userId, 'status': status});
    } catch (e) {
      throw Exception('Error al actualizar estado de usuario: $e');
    }
  }

  // Tenants
  Future<List<Map<String, dynamic>>> getAllTenants() async {
    try {
      final callable = _functions.httpsCallable('getAllTenants');
      final result = await callable();
      return List<Map<String, dynamic>>.from(result.data['tenants'] ?? []);
    } catch (e) {
      throw Exception('Error al obtener tenants: $e');
    }
  }

  Future<Map<String, dynamic>> getTenantById(String tenantId) async {
    try {
      final callable = _functions.httpsCallable('getTenantById');
      final result = await callable({'tenantId': tenantId});
      return Map<String, dynamic>.from(result.data ?? {});
    } catch (e) {
      throw Exception('Error al obtener tenant: $e');
    }
  }

  Future<void> updateTenant(String tenantId, Map<String, dynamic> updates) async {
    try {
      final callable = _functions.httpsCallable('updateTenant');
      await callable({'tenantId': tenantId, 'updates': updates});
    } catch (e) {
      throw Exception('Error al actualizar tenant: $e');
    }
  }

  Future<void> updateTenantStatus(String tenantId, String status) async {
    try {
      final callable = _functions.httpsCallable('updateTenantStatus');
      await callable({'tenantId': tenantId, 'status': status});
    } catch (e) {
      throw Exception('Error al actualizar estado de tenant: $e');
    }
  }

  // Sellers
  Future<List<Map<String, dynamic>>> getAllSellers() async {
    try {
      final callable = _functions.httpsCallable('getAllSellers');
      final result = await callable();
      return List<Map<String, dynamic>>.from(result.data['sellers'] ?? []);
    } catch (e) {
      throw Exception('Error al obtener sellers: $e');
    }
  }

  Future<Map<String, dynamic>> getSellerById(String sellerId) async {
    try {
      final callable = _functions.httpsCallable('getSellerById');
      final result = await callable({'sellerId': sellerId});
      return Map<String, dynamic>.from(result.data ?? {});
    } catch (e) {
      throw Exception('Error al obtener seller: $e');
    }
  }

  Future<void> updateSeller(String sellerId, Map<String, dynamic> updates) async {
    try {
      final callable = _functions.httpsCallable('updateSeller');
      await callable({'sellerId': sellerId, 'updates': updates});
    } catch (e) {
      throw Exception('Error al actualizar seller: $e');
    }
  }
}


