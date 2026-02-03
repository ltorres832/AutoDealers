import 'package:cloud_firestore/cloud_firestore.dart';
import 'firestore_service.dart';

/// Servicio de sincronización con retry logic y manejo de errores
class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  final FirestoreService _firestore = FirestoreService();
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Sincroniza con retry automático
  Future<T> syncWithRetry<T>({
    required Future<T> Function() action,
    int maxRetries = 3,
    Duration initialDelay = const Duration(seconds: 1),
  }) async {
    int attempt = 0;
    Duration delay = initialDelay;

    while (attempt < maxRetries) {
      try {
        return await action();
      } catch (e) {
        attempt++;
        if (attempt >= maxRetries) {
          throw SyncException(
            'Failed after $maxRetries attempts: ${e.toString()}',
            originalError: e,
          );
        }

        // Exponential backoff
        await Future.delayed(delay);
        delay = Duration(seconds: delay.inSeconds * 2);
      }
    }

    throw SyncException('Unexpected error in syncWithRetry');
  }

  /// Verifica conexión a Firestore
  Future<bool> checkConnection() async {
    try {
      await _db.collection('_health').limit(1).get();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Obtiene el estado de sincronización
  Stream<SyncStatus> watchSyncStatus() {
    return _db
        .collection('tenants')
        .doc(_firestore.currentTenantId)
        .snapshots()
        .map((doc) {
      if (!doc.exists) {
        return SyncStatus.disconnected;
      }

      final data = doc.data();
      final lastSync = data?['lastSync'] as Timestamp?;
      
      if (lastSync == null) {
        return SyncStatus.neverSynced;
      }

      final now = Timestamp.now();
      final diff = now.seconds - lastSync.seconds;

      if (diff > 300) { // 5 minutos
        return SyncStatus.outOfSync;
      }

      return SyncStatus.synced;
    });
  }

  /// Fuerza sincronización manual
  Future<void> forceSync() async {
    await syncWithRetry(
      action: () async {
        await _db
            .collection('tenants')
            .doc(_firestore.currentTenantId)
            .update({
          'lastSync': FieldValue.serverTimestamp(),
        });
      },
    );
  }
}

enum SyncStatus {
  synced,
  outOfSync,
  disconnected,
  neverSynced,
}

class SyncException implements Exception {
  final String message;
  final dynamic originalError;

  SyncException(this.message, {this.originalError});

  @override
  String toString() => 'SyncException: $message';
}


