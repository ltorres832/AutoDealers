// Repositorio de Autenticación - Data Layer
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/user.dart' as app_models;
import '../../config/firebase_config.dart';

class AuthRepository {
  final FirebaseAuth _auth = FirebaseConfig.auth;
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;

  // Stream del usuario actual
  Stream<app_models.User?> get authStateChanges => _auth.authStateChanges().asyncMap(
    (firebaseUser) async {
      if (firebaseUser == null) return null;
      return await _getUserFromFirestore(firebaseUser.uid);
    },
  );

  // Usuario actual
  app_models.User? get currentUser => _auth.currentUser != null
      ? null // Se obtiene desde Firestore
      : null;

  // Obtener usuario desde Firestore
  Future<app_models.User?> _getUserFromFirestore(String userId) async {
    try {
      final doc = await _firestore.collection('users').doc(userId).get();
      if (!doc.exists) return null;
      
      final data = doc.data()!;
      return app_models.User.fromJson({
        'id': doc.id,
        ...data,
        'createdAt': data['createdAt'] ?? Timestamp.now(),
        'updatedAt': data['updatedAt'] ?? Timestamp.now(),
      });
    } catch (e) {
      print('Error getting user from Firestore: $e');
      return null;
    }
  }

  // Iniciar sesión con email y contraseña
  Future<app_models.User> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user == null) {
        throw Exception('Usuario no encontrado');
      }

      final user = await _getUserFromFirestore(credential.user!.uid);
      if (user == null) {
        throw Exception('Usuario no encontrado en Firestore');
      }

      // Actualizar último login
      await _firestore.collection('users').doc(user.id).update({
        'lastLogin': FieldValue.serverTimestamp(),
      });

      return user.copyWith(lastLogin: DateTime.now());
    } catch (e) {
      throw Exception('Error al iniciar sesión: $e');
    }
  }

  // Registrar nuevo usuario
  Future<app_models.User> signUpWithEmailAndPassword({
    required String email,
    required String password,
    required String name,
    required app_models.UserRole role,
    required String tenantId,
    required String membershipId,
    required app_models.TenantType membershipType,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user == null) {
        throw Exception('Error al crear usuario');
      }

      final now = DateTime.now();
      final user = app_models.User(
        id: credential.user!.uid,
        email: email,
        name: name,
        role: role,
        tenantId: tenantId,
        membershipId: membershipId,
        membershipType: membershipType,
        status: app_models.UserStatus.active,
        createdAt: now,
        updatedAt: now,
        settings: {},
      );

      // Guardar en Firestore
      await _firestore.collection('users').doc(user.id).set(user.toJson());

      return user;
    } catch (e) {
      throw Exception('Error al registrar usuario: $e');
    }
  }

  // Cerrar sesión
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Obtener token de autenticación
  Future<String?> getIdToken() async {
    return await _auth.currentUser?.getIdToken();
  }

  // Verificar si el usuario está autenticado
  bool get isAuthenticated => _auth.currentUser != null;

  // Obtener tenantId del usuario actual
  Future<String?> getCurrentTenantId() async {
    final user = _auth.currentUser;
    if (user == null) return null;

    try {
      // Intentar obtener de custom claims primero
      final idTokenResult = await user.getIdTokenResult();
      final tenantId = idTokenResult.claims?['tenantId'] as String?;
      if (tenantId != null) return tenantId;

      // Si no hay en claims, obtener del documento de usuario
      final userDoc = await _firestore.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        return userDoc.data()?['tenantId'] as String?;
      }
    } catch (e) {
      print('Error getting tenantId: $e');
    }

    return null;
  }
}


