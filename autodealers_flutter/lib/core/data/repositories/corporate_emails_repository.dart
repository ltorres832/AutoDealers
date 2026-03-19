// Repositorio de Corporate Emails - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class CorporateEmailsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener corporate emails (stream en tiempo real)
  Stream<List<Map<String, dynamic>>> watchCorporateEmails() {
    return _firestore
        .collection('corporate_emails')
        .orderBy('createdAt', descending: true)
        .limit(100)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) {
              final data = doc.data() as Map<String, dynamic>;
              return {
                'id': doc.id,
                ...data,
                'createdAt': data['createdAt']?.toDate(),
                'updatedAt': data['updatedAt']?.toDate(),
                'activatedAt': data['activatedAt']?.toDate(),
                'suspendedAt': data['suspendedAt']?.toDate(),
              } as Map<String, dynamic>;
            })
            .toList());
  }

  // Crear corporate email
  Future<String> createCorporateEmail(String email) async {
    try {
      final result = await _functions.httpsCallable('createCorporateEmail').call({
        'email': email,
      });

      return (result.data as Map<String, dynamic>)['id'] as String;
    } catch (e) {
      throw Exception('Error al crear corporate email: $e');
    }
  }

  // Obtener corporate emails
  Future<List<Map<String, dynamic>>> getCorporateEmails() async {
    try {
      final result = await _functions.httpsCallable('getCorporateEmails').call();

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['emails'] as List);
    } catch (e) {
      throw Exception('Error al obtener corporate emails: $e');
    }
  }

  // Activar corporate email
  Future<void> activateCorporateEmail(String emailId) async {
    try {
      await _functions.httpsCallable('activateCorporateEmail').call({
        'emailId': emailId,
      });
    } catch (e) {
      throw Exception('Error al activar corporate email: $e');
    }
  }

  // Suspender corporate email
  Future<void> suspendCorporateEmail(String emailId) async {
    try {
      await _functions.httpsCallable('suspendCorporateEmail').call({
        'emailId': emailId,
      });
    } catch (e) {
      throw Exception('Error al suspender corporate email: $e');
    }
  }

  // Eliminar corporate email
  Future<void> deleteCorporateEmail(String emailId) async {
    try {
      await _functions.httpsCallable('deleteCorporateEmail').call({
        'emailId': emailId,
      });
    } catch (e) {
      throw Exception('Error al eliminar corporate email: $e');
    }
  }
}


