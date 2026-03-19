// Repositorio de Citas - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/models/appointment.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class AppointmentsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener citas del tenant
  Stream<List<Appointment>> watchAppointments({
    String? tenantId,
    String? leadId,
    String? assignedTo,
    AppointmentStatus? status,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    Query query = _firestore
        .collection('tenants')
        .doc(tenantId ?? '')
        .collection('appointments');

    if (leadId != null) {
      query = query.where('leadId', isEqualTo: leadId);
    }
    if (assignedTo != null) {
      query = query.where('assignedTo', isEqualTo: assignedTo);
    }
    if (status != null) {
      query = query.where('status', isEqualTo: status.name);
    }

    query = query.orderBy('scheduledAt', descending: false);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) => Appointment.fromJson({
              'id': doc.id,
              ...doc.data() as Map<String, dynamic>,
            }))
        .toList());
  }

  // Crear cita
  Future<String> createAppointment(Appointment appointment, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    final docRef = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('appointments')
        .doc();

    final data = appointment.toJson();
    data.remove('id');

    await docRef.set({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  // Actualizar cita
  Future<void> updateAppointment(
    String appointmentId,
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
        .collection('appointments')
        .doc(appointmentId)
        .update({
      ...updates,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Eliminar cita
  Future<void> deleteAppointment(String appointmentId, {String? tenantId}) async {
    final finalTenantId = tenantId ?? await _getTenantId();
    if (finalTenantId == null) {
      throw Exception('Tenant ID requerido');
    }

    await _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('appointments')
        .doc(appointmentId)
        .delete();
  }
}


