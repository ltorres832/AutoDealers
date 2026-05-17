// Repositorio de FI (Financing & Insurance) - Data Layer
import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../config/firebase_config.dart';

class FIRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== FI Requests ====================

  /// Obtener solicitudes F&I
  Future<List<Map<String, dynamic>>> getFIRequests({
    required String tenantId,
    String? status,
    String? clientId,
    String? createdBy,
    String? role,
  }) async {
    try {
      final result = await _functions.httpsCallable('getFIRequests').call({
        'tenantId': tenantId,
        if (status != null) 'status': status,
        if (clientId != null) 'clientId': clientId,
        if (createdBy != null) 'createdBy': createdBy,
        if (role != null) 'role': role,
      });

      final data = result.data as Map<String, dynamic>;
      final requests = data['requests'] as List<dynamic>;
      return requests.cast<Map<String, dynamic>>();
    } catch (e) {
      throw Exception('Error al obtener solicitudes F&I: $e');
    }
  }

  /// Stream de solicitudes F&I en tiempo real
  Stream<List<Map<String, dynamic>>> watchFIRequests({
    required String tenantId,
    String? status,
    String? clientId,
    String? createdBy,
  }) {
    Query query = _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_requests');

    if (status != null && status != 'all') {
      query = query.where('status', isEqualTo: status);
    }
    if (clientId != null) {
      query = query.where('clientId', isEqualTo: clientId);
    }
    if (createdBy != null) {
      query = query.where('createdBy', isEqualTo: createdBy);
    }

    return query.snapshots().map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {
          'id': doc.id,
          ...data,
        };
      }).toList();
    });
  }

  /// Obtener una solicitud F&I específica
  Future<Map<String, dynamic>> getFIRequest({
    required String tenantId,
    required String requestId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getFIRequest').call({
        'tenantId': tenantId,
        'requestId': requestId,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener solicitud F&I: $e');
    }
  }

  /// Crear solicitud F&I
  Future<Map<String, dynamic>> createFIRequest({
    required String tenantId,
    required String clientId,
    required Map<String, dynamic> employment,
    required Map<String, dynamic> creditInfo,
    required Map<String, dynamic> personalInfo,
    String? sellerNotes,
    bool submit = false,
  }) async {
    try {
      final result = await _functions.httpsCallable('createFIRequest').call({
        'tenantId': tenantId,
        'clientId': clientId,
        'employment': employment,
        'creditInfo': creditInfo,
        'personalInfo': personalInfo,
        if (sellerNotes != null) 'sellerNotes': sellerNotes,
        'submit': submit,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear solicitud F&I: $e');
    }
  }

  /// Actualizar solicitud F&I
  Future<Map<String, dynamic>> updateFIRequest({
    required String tenantId,
    required String requestId,
    String? status,
    String? fiManagerNotes,
    String? internalNotes,
    String? note,
  }) async {
    try {
      final result = await _functions.httpsCallable('updateFIRequest').call({
        'tenantId': tenantId,
        'requestId': requestId,
        if (status != null) 'status': status,
        if (fiManagerNotes != null) 'fiManagerNotes': fiManagerNotes,
        if (internalNotes != null) 'internalNotes': internalNotes,
        if (note != null) 'note': note,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al actualizar solicitud F&I: $e');
    }
  }

  /// Enviar solicitud F&I
  Future<Map<String, dynamic>> submitFIRequest({
    required String tenantId,
    required String requestId,
    String? sellerNotes,
  }) async {
    try {
      final result = await _functions.httpsCallable('submitFIRequest').call({
        'tenantId': tenantId,
        'requestId': requestId,
        if (sellerNotes != null) 'sellerNotes': sellerNotes,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al enviar solicitud F&I: $e');
    }
  }

  // ==================== FI Clients ====================

  /// Obtener clientes F&I
  Future<List<Map<String, dynamic>>> getFIClients({
    required String tenantId,
  }) async {
    try {
      final result = await _functions.httpsCallable('getFIClients').call({
        'tenantId': tenantId,
      });

      final data = result.data as Map<String, dynamic>;
      final clients = data['clients'] as List<dynamic>;
      return clients.cast<Map<String, dynamic>>();
    } catch (e) {
      throw Exception('Error al obtener clientes F&I: $e');
    }
  }

  /// Stream de clientes F&I en tiempo real
  Stream<List<Map<String, dynamic>>> watchFIClients({
    required String tenantId,
  }) {
    return _firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('fi_clients')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        return {
          'id': doc.id,
          ...data,
        };
      }).toList();
    });
  }

  /// Crear cliente F&I
  Future<Map<String, dynamic>> createFIClient({
    required String tenantId,
    required String name,
    required String phone,
    String? email,
    String? address,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    double? vehiclePrice,
    double? downPayment,
  }) async {
    try {
      final result = await _functions.httpsCallable('createFIClient').call({
        'tenantId': tenantId,
        'name': name,
        'phone': phone,
        if (email != null) 'email': email,
        if (address != null) 'address': address,
        if (vehicleMake != null) 'vehicleMake': vehicleMake,
        if (vehicleModel != null) 'vehicleModel': vehicleModel,
        if (vehicleYear != null) 'vehicleYear': vehicleYear,
        if (vehiclePrice != null) 'vehiclePrice': vehiclePrice,
        if (downPayment != null) 'downPayment': downPayment,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al crear cliente F&I: $e');
    }
  }

  // ==================== Calculator ====================

  /// Calcular financiamiento
  Future<Map<String, dynamic>> calculateFinancing({
    required String tenantId,
    String? requestId,
    required double vehiclePrice,
    required double downPayment,
    required double interestRate,
    required int termMonths,
  }) async {
    try {
      final result = await _functions.httpsCallable('calculateFinancing').call({
        'tenantId': tenantId,
        if (requestId != null) 'requestId': requestId,
        'vehiclePrice': vehiclePrice,
        'downPayment': downPayment,
        'interestRate': interestRate,
        'termMonths': termMonths,
      });

      final data = result.data as Map<String, dynamic>;
      return data['calculation'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al calcular financiamiento: $e');
    }
  }

  // ==================== Approval Score ====================

  /// Calcular score de aprobación
  Future<Map<String, dynamic>> calculateApprovalScore({
    required String tenantId,
    required String requestId,
    required double vehiclePrice,
    required double downPayment,
    required double monthlyPayment,
  }) async {
    try {
      final result = await _functions.httpsCallable('calculateApprovalScore').call({
        'tenantId': tenantId,
        'requestId': requestId,
        'vehiclePrice': vehiclePrice,
        'downPayment': downPayment,
        'monthlyPayment': monthlyPayment,
      });

      final data = result.data as Map<String, dynamic>;
      return data['score'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al calcular score de aprobación: $e');
    }
  }

  // ==================== Credit Report ====================

  /// Obtener reporte de crédito
  Future<Map<String, dynamic>> getCreditReport({
    required String tenantId,
    required String clientId,
    String? provider,
  }) async {
    try {
      final result = await _functions.httpsCallable('getCreditReport').call({
        'tenantId': tenantId,
        'clientId': clientId,
        if (provider != null) 'provider': provider,
      });

      final data = result.data as Map<String, dynamic>;
      return data['creditReport'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener reporte de crédito: $e');
    }
  }

  // ==================== Financing Options ====================

  /// Comparar opciones de financiamiento
  Future<Map<String, dynamic>> compareFinancingOptions({
    required String tenantId,
    required String requestId,
    required List<Map<String, dynamic>> options,
  }) async {
    try {
      final result = await _functions.httpsCallable('compareFinancingOptions').call({
        'tenantId': tenantId,
        'requestId': requestId,
        'options': options,
      });

      final data = result.data as Map<String, dynamic>;
      return data['comparison'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al comparar opciones de financiamiento: $e');
    }
  }

  // ==================== Documents ====================

  /// Generar documento F&I
  Future<Map<String, dynamic>> generateFIDocument({
    required String tenantId,
    required String requestId,
    required String template,
    Map<String, dynamic>? customData,
  }) async {
    try {
      final result = await _functions.httpsCallable('generateFIDocument').call({
        'tenantId': tenantId,
        'requestId': requestId,
        'template': template,
        if (customData != null) 'customData': customData,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al generar documento F&I: $e');
    }
  }

  /// Solicitar documentos
  Future<Map<String, dynamic>> requestFIDocuments({
    required String tenantId,
    required String requestId,
    required List<Map<String, dynamic>> documents,
  }) async {
    try {
      final result = await _functions.httpsCallable('requestFIDocuments').call({
        'tenantId': tenantId,
        'requestId': requestId,
        'documents': documents,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al solicitar documentos: $e');
    }
  }

  // ==================== Cosigner ====================

  /// Agregar cosignatario
  Future<void> addCosigner({
    required String tenantId,
    required String requestId,
    required Map<String, dynamic> cosignerInfo,
  }) async {
    try {
      await _functions.httpsCallable('addCosigner').call({
        'tenantId': tenantId,
        'requestId': requestId,
        'cosignerInfo': cosignerInfo,
      });
    } catch (e) {
      throw Exception('Error al agregar cosignatario: $e');
    }
  }

  // ==================== Metrics ====================

  /// Obtener métricas F&I
  Future<Map<String, dynamic>> getFIMetrics({
    required String tenantId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final result = await _functions.httpsCallable('getFIMetrics').call({
        'tenantId': tenantId,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      });

      final data = result.data as Map<String, dynamic>;
      return data['metrics'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener métricas F&I: $e');
    }
  }
}


