import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/user_role.dart';

/// Modelo de Cita
class Appointment {
  final String id;
  final String tenantId;
  final String leadId;
  final String? sellerId;
  final DateTime scheduledAt;
  final String status;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  Appointment({
    required this.id,
    required this.tenantId,
    required this.leadId,
    this.sellerId,
    required this.scheduledAt,
    required this.status,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Appointment.fromFirestore(Map<String, dynamic> data, String id) {
    return Appointment(
      id: id,
      tenantId: data['tenantId'] ?? '',
      leadId: data['leadId'] ?? '',
      sellerId: data['sellerId'],
      scheduledAt: _parseTimestamp(data['scheduledAt']),
      status: data['status'] ?? 'scheduled',
      notes: data['notes'],
      createdAt: _parseTimestamp(data['createdAt']),
      updatedAt: _parseTimestamp(data['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'tenantId': tenantId,
      'leadId': leadId,
      'sellerId': sellerId,
      'scheduledAt': scheduledAt.toIso8601String(),
      'status': status,
      'notes': notes,
    };
  }

  static DateTime _parseTimestamp(dynamic timestamp) {
    if (timestamp == null) return DateTime.now();
    if (timestamp is DateTime) return timestamp;
    if (timestamp is Timestamp) return timestamp.toDate();
    if (timestamp is String) return DateTime.parse(timestamp);
    return DateTime.now();
  }
}

/// Servicio para gestión de Citas
class AppointmentsService {
  final FirestoreService _firestore = FirestoreService();
  final AuthService _auth = AuthService();

  /// Obtiene todas las citas con sincronización en tiempo real
  Stream<List<Appointment>> watchAppointments({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
  }) async* {
    final permissions = await _auth.getPermissions();
    if (permissions == null) return;

    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) return;

    Query query = FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments');

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

    if (startDate != null) {
      query = query.where('scheduledAt',
          isGreaterThanOrEqualTo: Timestamp.fromDate(startDate));
    }

    if (endDate != null) {
      query = query.where('scheduledAt',
          isLessThanOrEqualTo: Timestamp.fromDate(endDate));
    }

    query = query.orderBy('scheduledAt', descending: false);

    await for (final snapshot in query.snapshots()) {
      yield snapshot.docs.map((doc) {
        return Appointment.fromFirestore(doc.data(), doc.id);
      }).toList();
    }
  }

  /// Crea una nueva cita
  Future<String> createAppointment({
    required String leadId,
    required DateTime scheduledAt,
    String? notes,
    String? sellerId,
  }) async {
    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    final permissions = await _auth.getPermissions();
    final currentUserId = _auth.currentUser?.uid;

    return await _firestore.create(
      collection: 'appointments',
      data: {
        'tenantId': tenantId,
        'leadId': leadId,
        'sellerId': sellerId ?? (permissions?.role == UserRole.seller ? currentUserId : null),
        'scheduledAt': scheduledAt.toIso8601String(),
        'status': 'scheduled',
        'notes': notes,
      },
    );
  }

  /// Actualiza una cita
  Future<void> updateAppointment(
    String appointmentId,
    Map<String, dynamic> updates,
  ) async {
    await _firestore.update(
      collection: 'appointments',
      documentId: appointmentId,
      data: updates,
    );
  }

  /// Elimina una cita
  Future<void> deleteAppointment(String appointmentId) async {
    await _firestore.delete(
      collection: 'appointments',
      documentId: appointmentId,
    );
  }
}


