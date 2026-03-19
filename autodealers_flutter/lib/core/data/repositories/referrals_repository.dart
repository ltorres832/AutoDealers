// Repositorio de Referrals - Data Layer
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../../config/firebase_config.dart';

class ReferralsRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  final FirebaseFunctions _functions = FirebaseConfig.functions;

  // Obtener código de referido
  Future<String> getReferralCode(String userId) async {
    try {
      final result = await _functions.httpsCallable('getReferralCode').call({
        'userId': userId,
      });

      return (result.data as Map<String, dynamic>)['referralCode'] as String;
    } catch (e) {
      throw Exception('Error al obtener código de referido: $e');
    }
  }

  // Obtener referidos del usuario
  Future<List<Map<String, dynamic>>> getMyReferrals(String userId) async {
    try {
      final result = await _functions.httpsCallable('getMyReferrals').call({
        'userId': userId,
      });

      final data = result.data as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(data['referrals'] as List);
    } catch (e) {
      throw Exception('Error al obtener referidos: $e');
    }
  }

  // Obtener recompensas del usuario
  Future<Map<String, dynamic>> getMyRewards(String userId) async {
    try {
      final result = await _functions.httpsCallable('getMyRewards').call({
        'userId': userId,
      });

      return (result.data as Map<String, dynamic>)['rewards'] as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener recompensas: $e');
    }
  }

  // Usar código de referido
  Future<String> useReferralCode({
    required String referralCode,
    required String newUserId,
  }) async {
    try {
      final result = await _functions.httpsCallable('useReferralCode').call({
        'referralCode': referralCode,
        'newUserId': newUserId,
      });

      return (result.data as Map<String, dynamic>)['referralId'] as String;
    } catch (e) {
      throw Exception('Error al usar código de referido: $e');
    }
  }

  // Obtener todos los referrals (admin)
  Future<Map<String, dynamic>> getAllReferrals({
    String? status,
    String? userId,
    int? limit,
  }) async {
    try {
      final result = await _functions.httpsCallable('getAllReferrals').call({
        'status': status,
        'userId': userId,
        'limit': limit,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al obtener referrals: $e');
    }
  }
}


