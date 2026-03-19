// Repositorio de Reminders - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';
import '../services/firestore_service.dart';

class RemindersRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirestoreService _firestoreService = FirestoreService();

  Future<String?> _getTenantId() async {
    return await _firestoreService.getCurrentTenantId();
  }

  // Obtener recordatorios (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchReminders({
    String? tenantId,
    String? status,
  }) {
    final finalTenantId = tenantId ?? '';

    Query query = _firestore
        .collection('tenants')
        .doc(finalTenantId)
        .collection('post_sale_reminders');

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    query = query.orderBy('nextReminder', descending: false).limit(100);

    return query.snapshots().map((snapshot) => snapshot.docs
        .map((doc) {
          final data = doc.data() as Map<String, dynamic>;
          return {
            'id': doc.id,
            ...data,
            'nextReminder': data['nextReminder']?.toDate(),
            'sentAt': data['sentAt']?.toDate(),
            'createdAt': data['createdAt']?.toDate(),
          } as Map<String, dynamic>;
        })
        .toList());
  }

  // Crear recordatorio
  Future<Map<String, dynamic>> createReminder({
    required String tenantId,
    required Map<String, dynamic> reminderData,
  }) async {
    try {
      final result = await _functions.httpsCallable('createReminderFunction').call({
        'reminderData': reminderData,
      });

      return (result.data as Map<String, dynamic>)['reminder'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear recordatorio: $e');
    }
  }

  // Crear recordatorios post-venta
  Future<List<Map<String, dynamic>>> createPostSaleReminders({
    required String tenantId,
    required String saleId,
    required String customerId,
    required String vehicleId,
    List<String>? selectedReminders,
  }) async {
    try {
      final result = await _functions.httpsCallable('createPostSaleRemindersFunction').call({
        'tenantId': tenantId,
        'saleId': saleId,
        'customerId': customerId,
        'vehicleId': vehicleId,
        'selectedReminders': selectedReminders,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['reminders'] as List);
    } catch (e) {
      throw Exception('Error al crear recordatorios post-venta: $e');
    }
  }

  // Obtener recordatorios pendientes
  Future<List<Map<String, dynamic>>> getPendingReminders(String tenantId) async {
    try {
      final result = await _functions.httpsCallable('getPendingRemindersFunction').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['reminders'] as List);
    } catch (e) {
      throw Exception('Error al obtener recordatorios pendientes: $e');
    }
  }

  // Obtener recordatorios
  Future<List<Map<String, dynamic>>> getReminders({
    required String tenantId,
    Map<String, dynamic>? filters,
  }) async {
    try {
      final result = await _functions.httpsCallable('getRemindersFunction').call({
        'tenantId': tenantId,
        'filters': filters,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['reminders'] as List);
    } catch (e) {
      throw Exception('Error al obtener recordatorios: $e');
    }
  }

  // Marcar como enviado
  Future<void> markReminderAsSent({
    required String tenantId,
    required String reminderId,
  }) async {
    try {
      await _functions.httpsCallable('markReminderAsSentFunction').call({
        'tenantId': tenantId,
        'reminderId': reminderId,
      });
    } catch (e) {
      throw Exception('Error al marcar recordatorio como enviado: $e');
    }
  }

  // Cancelar recordatorio
  Future<void> cancelReminder({
    required String tenantId,
    required String reminderId,
  }) async {
    try {
      await _functions.httpsCallable('cancelReminder').call({
        'tenantId': tenantId,
        'reminderId': reminderId,
      });
    } catch (e) {
      throw Exception('Error al cancelar recordatorio: $e');
    }
  }
}


