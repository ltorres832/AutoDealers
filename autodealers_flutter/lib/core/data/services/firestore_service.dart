// Servicio centralizado para Firestore
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../config/firebase_config.dart';

class FirestoreService {
  static final FirestoreService _instance = FirestoreService._internal();
  factory FirestoreService() => _instance;
  FirestoreService._internal();

  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseAuth _auth = FirebaseConfig.auth;

  /// Obtiene el tenantId del usuario actual
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

  /// Configuración de Firestore para sincronización
  void configure() {
    _firestore.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  }

  /// Obtiene un stream de documentos de una colección
  Stream<List<Map<String, dynamic>>> watchCollection({
    required String collection,
    String? subcollection,
    String? orderBy,
    bool descending = true,
    int? limit,
    Map<String, dynamic>? where,
    String? tenantId,
  }) async* {
    final finalTenantId = tenantId ?? await getCurrentTenantId();
    if (finalTenantId == null) {
      yield [];
      return;
    }

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection(collection);

    if (subcollection != null) {
      // No se puede hacer query.doc() en una Query, solo en CollectionReference
      // Si necesitas una subcolección, debes construir la ruta completa
      // Por ahora, ignoramos esto o lo manejamos de otra manera
    }

    if (where != null) {
      where.forEach((field, value) {
        query = query.where(field, isEqualTo: value);
      });
    }

    if (orderBy != null) {
      query = query.orderBy(orderBy, descending: descending);
    }

    if (limit != null) {
      query = query.limit(limit);
    }

    yield* query.snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => {
              'id': doc.id,
              ...doc.data() as Map<String, dynamic>,
            }).toList());
  }

  /// Obtiene un documento específico
  Stream<Map<String, dynamic>?> watchDocument({
    required String collection,
    required String documentId,
    String? subcollection,
    String? subdocumentId,
    String? tenantId,
  }) async* {
    final finalTenantId = tenantId ?? await getCurrentTenantId();
    if (finalTenantId == null) {
      yield null;
      return;
    }

    DocumentReference docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection(collection)
        .doc(documentId);

    if (subcollection != null && subdocumentId != null) {
      docRef = docRef.collection(subcollection).doc(subdocumentId);
    }

    await for (final doc in docRef.snapshots()) {
      if (!doc.exists) {
        yield null;
      } else {
        yield {
          'id': doc.id,
          ...doc.data() as Map<String, dynamic>,
        };
      }
    }
  }

  /// Crea un documento
  Future<String> create({
    required String collection,
    required Map<String, dynamic> data,
    String? tenantId,
  }) async {
    final finalTenantId = tenantId ?? await getCurrentTenantId();
    if (finalTenantId == null) throw Exception('No tenant ID');

    final docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection(collection)
        .doc();

    await docRef.set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  /// Actualiza un documento
  Future<void> update({
    required String collection,
    required String documentId,
    required Map<String, dynamic> data,
    String? tenantId,
  }) async {
    final finalTenantId = tenantId ?? await getCurrentTenantId();
    if (finalTenantId == null) throw Exception('No tenant ID');

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection(collection)
        .doc(documentId)
        .update({
      ...data,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Elimina un documento
  Future<void> delete({
    required String collection,
    required String documentId,
    String? tenantId,
  }) async {
    final finalTenantId = tenantId ?? await getCurrentTenantId();
    if (finalTenantId == null) throw Exception('No tenant ID');

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection(collection)
        .doc(documentId)
        .delete();
  }
}


