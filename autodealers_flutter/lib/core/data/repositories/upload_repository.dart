// Repositorio de Upload - Data Layer
import 'dart:typed_data';
import 'dart:convert';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../../config/firebase_config.dart';

class UploadRepository {
  final FirebaseFunctions _functions = FirebaseConfig.functions;
  final FirebaseStorage _storage = FirebaseConfig.storage;

  // Upload de archivo usando Cloud Function
  Future<Map<String, dynamic>> uploadFile({
    required Uint8List fileBytes,
    required String filename,
    required String type,
    String? tenantId,
    String? vehicleId,
    String? contentType,
  }) async {
    try {
      // Convertir bytes a base64 para enviar a Cloud Function
      final base64File = _base64Encode(fileBytes);

      final result = await _functions.httpsCallable('uploadFile').call({
        'file': base64File,
        'type': type,
        'tenantId': tenantId,
        'vehicleId': vehicleId,
        'filename': filename,
        'contentType': contentType,
      });

      return result.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Error al subir archivo: $e');
    }
  }

  // Upload directo a Firebase Storage (alternativa)
  Future<String> uploadToStorage({
    required Uint8List fileBytes,
    required String path,
    required String contentType,
  }) async {
    try {
      final ref = _storage.ref().child(path);
      final uploadTask = ref.putData(
        fileBytes,
        SettableMetadata(contentType: contentType),
      );

      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      return downloadUrl;
    } catch (e) {
      throw Exception('Error al subir archivo a Storage: $e');
    }
  }

  // Eliminar archivo
  Future<void> deleteFile(String filePath) async {
    try {
      await _functions.httpsCallable('deleteFile').call({
        'filePath': filePath,
      });
    } catch (e) {
      throw Exception('Error al eliminar archivo: $e');
    }
  }

  // Helper para convertir bytes a base64
  String _base64Encode(Uint8List bytes) {
    return base64Encode(bytes);
  }
}


