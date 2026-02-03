import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_role.dart';
import 'firestore_service.dart';

/// Servicio de autenticación con detección de roles
class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Obtiene el usuario actual
  User? get currentUser => _auth.currentUser;

  /// Stream del estado de autenticación
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Obtiene los permisos del usuario actual
  Future<Permissions?> getPermissions() async {
    final user = currentUser;
    if (user == null) return null;

    try {
      // Obtener custom claims del token
      final idTokenResult = await user.getIdTokenResult();
      final roleString = idTokenResult.claims?['role'] as String?;
      final tenantId = idTokenResult.claims?['tenantId'] as String?;
      final dealerId = idTokenResult.claims?['dealerId'] as String?;

      // Si no hay claims, obtener del documento de usuario
      if (roleString == null) {
        final userDoc = await _firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) return null;

        final userData = userDoc.data()!;
        final role = UserRoleExtension.fromString(userData['role'] as String?);
        if (role == null) return null;

        return Permissions(
          role: role,
          tenantId: userData['tenantId'] as String?,
          dealerId: userData['dealerId'] as String?,
        );
      }

      final role = UserRoleExtension.fromString(roleString);
      if (role == null) return null;

      return Permissions(
        role: role,
        tenantId: tenantId,
        dealerId: dealerId,
      );
    } catch (e) {
      print('Error getting permissions: $e');
      return null;
    }
  }

  /// Obtiene información completa del usuario
  Future<Map<String, dynamic>?> getUserInfo() async {
    final user = currentUser;
    if (user == null) return null;

    try {
      final userDoc = await _firestore.collection('users').doc(user.uid).get();
      if (!userDoc.exists) return null;

      return {
        'id': user.uid,
        'email': user.email,
        ...userDoc.data()!,
      };
    } catch (e) {
      print('Error getting user info: $e');
      return null;
    }
  }

  /// Cierra sesión
  Future<void> signOut() async {
    await _auth.signOut();
  }

  /// Verifica si el usuario está autenticado
  bool get isAuthenticated => currentUser != null;
}


