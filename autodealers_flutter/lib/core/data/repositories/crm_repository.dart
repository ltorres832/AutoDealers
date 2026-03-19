// Repositorio de CRM - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/lead.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class CrmRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;

  // Obtener tenantId actual (helper)
  Future<String?> _getTenantId() async {
    // Esto debería venir del AuthRepository o del contexto
    // Por ahora, lo dejamos como método helper
    return null; // Se implementará con el contexto de autenticación
  }

  // Obtener leads del tenant
  Stream<List<Lead>> watchLeads({
    String? tenantId,
    LeadStatus? status,
    String? assignedTo,
    LeadSource? source,
    int? limit,
  }) {
    return _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('leads')
        .whereIf(status != null, 'status', isEqualTo: status?.name.replaceAll('_', ''))
        .whereIf(assignedTo != null, 'assignedTo', isEqualTo: assignedTo)
        .whereIf(source != null, 'source', isEqualTo: source?.name)
        .orderBy('createdAt', descending: true)
        .limitIf(limit != null, limit ?? 50)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => Lead.fromJson({
                  'id': doc.id,
                  ...doc.data() as Map<String, dynamic>,
                }))
            .toList());
  }

  // Obtener un lead específico
  Stream<Lead?> watchLead(String leadId, {String? tenantId}) {
    return _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('leads')
        .doc(leadId)
        .snapshots()
        .map((doc) {
      if (!doc.exists) return null;
      return Lead.fromJson({
        'id': doc.id,
        ...doc.data() as Map<String, dynamic>,
      });
    });
  }

  // Crear un nuevo lead
  Future<String> createLead(Lead lead, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    final docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('leads')
        .doc();

    final data = lead.toJson();
    data.remove('id'); // Remover id antes de guardar

    await docRef.set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  // Actualizar un lead
  Future<void> updateLead(String leadId, Map<String, dynamic> updates, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('leads')
        .doc(leadId)
        .update({
      ...updates,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Eliminar un lead
  Future<void> deleteLead(String leadId, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('leads')
        .doc(leadId)
        .delete();
  }

  // Agregar interacción a un lead
  Future<void> addInteraction(String leadId, Interaction interaction, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('leads')
        .doc(leadId)
        .update({
      'interactions': FieldValue.arrayUnion([interaction.toJson()]),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}

// Extension para Query con condiciones opcionales
extension QueryExtension on Query {
  Query whereIf(bool condition, String field, {Object? isEqualTo}) {
    if (condition && isEqualTo != null) {
      return where(field, isEqualTo: isEqualTo);
    }
    return this;
  }

  Query limitIf(bool condition, int limitValue) {
    if (condition) {
      return limit(limitValue);
    }
    return this;
  }
}


