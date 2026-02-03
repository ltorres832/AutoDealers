import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/lead.dart';
import '../../../core/models/user_role.dart';

/// Servicio para gestión de Leads
class LeadsService {
  final FirestoreService _firestore = FirestoreService();
  final AuthService _auth = AuthService();

  /// Obtiene todos los leads con sincronización en tiempo real
  Stream<List<Lead>> watchLeads({
    String? status,
    String? sellerId,
  }) async* {
    final permissions = await _auth.getPermissions();
    if (permissions == null) return;

    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) return;

    Query query = FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('leads');

    // Filtros según rol
    if (permissions.role == UserRole.seller) {
      final user = _auth.currentUser;
      if (user != null) {
        query = query.where('sellerId', isEqualTo: user.uid);
      }
    }

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    if (sellerId != null) {
      query = query.where('sellerId', isEqualTo: sellerId);
    }

    query = query.orderBy('createdAt', descending: true);

    await for (final snapshot in query.snapshots()) {
      yield snapshot.docs.map((doc) {
        return Lead.fromFirestore(doc.data(), doc.id);
      }).toList();
    }
  }

  /// Obtiene un lead por ID
  Stream<Lead?> watchLead(String leadId) async* {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) {
      yield null;
      return;
    }

    await for (final doc in FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .doc(leadId)
        .snapshots()) {
      if (!doc.exists) {
        yield null;
      } else {
        yield Lead.fromFirestore(doc.data()!, doc.id);
      }
    }
  }

  /// Crea un nuevo lead
  Future<String> createLead({
    required String source,
    required LeadContact contact,
    String? notes,
    String? sellerId,
  }) async {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    final permissions = await _auth.getPermissions();
    final currentUserId = _auth.currentUser?.uid;

    return await _firestore.create(
      collection: 'leads',
      data: {
        'tenantId': tenantId,
        'source': source,
        'status': 'new',
        'contact': contact.toMap(),
        'notes': notes ?? '',
        'interactions': [],
        'sellerId': sellerId ?? (permissions?.role == UserRole.seller ? currentUserId : null),
        'assignedTo': sellerId ?? currentUserId,
      },
    );
  }

  /// Actualiza un lead
  Future<void> updateLead(String leadId, Map<String, dynamic> updates) async {
    await _firestore.update(
      collection: 'leads',
      documentId: leadId,
      data: updates,
    );
  }

  /// Cambia el estado de un lead
  Future<void> updateLeadStatus(String leadId, String status) async {
    await updateLead(leadId, {'status': status});
  }

  /// Agrega una interacción a un lead
  Future<void> addInteraction(
    String leadId,
    LeadInteraction interaction,
  ) async {
    final lead = await watchLead(leadId).first;
    if (lead == null) throw Exception('Lead not found');

    final interactions = [...lead.interactions, interaction];

    await updateLead(leadId, {
      'interactions': interactions.map((i) => i.toMap()).toList(),
    });
  }

  /// Elimina un lead
  Future<void> deleteLead(String leadId) async {
    await _firestore.delete(
      collection: 'leads',
      documentId: leadId,
    );
  }
}


