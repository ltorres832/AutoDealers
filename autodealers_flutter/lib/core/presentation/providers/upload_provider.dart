// Provider de Upload - Presentation Layer
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../../data/repositories/upload_repository.dart';

class UploadProvider extends ChangeNotifier {
  final UploadRepository _uploadRepository = UploadRepository();

  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String? _error;
  String? _uploadedUrl;

  bool get isUploading => _isUploading;
  double get uploadProgress => _uploadProgress;
  String? get error => _error;
  String? get uploadedUrl => _uploadedUrl;

  // Upload de archivo
  Future<String?> uploadFile({
    required Uint8List fileBytes,
    required String filename,
    required String type,
    String? tenantId,
    String? vehicleId,
    String? contentType,
  }) async {
    _isUploading = true;
    _uploadProgress = 0.0;
    _error = null;
    _uploadedUrl = null;
    notifyListeners();

    try {
      _uploadProgress = 0.3;
      notifyListeners();

      final result = await _uploadRepository.uploadFile(
        fileBytes: fileBytes,
        filename: filename,
        type: type,
        tenantId: tenantId,
        vehicleId: vehicleId,
        contentType: contentType,
      );

      _uploadProgress = 1.0;
      _uploadedUrl = result['url'] as String?;
      _isUploading = false;
      notifyListeners();

      return _uploadedUrl;
    } catch (e) {
      _error = e.toString();
      _isUploading = false;
      _uploadProgress = 0.0;
      notifyListeners();
      return null;
    }
  }

  // Upload directo a Storage
  Future<String?> uploadToStorage({
    required Uint8List fileBytes,
    required String path,
    required String contentType,
  }) async {
    _isUploading = true;
    _uploadProgress = 0.0;
    _error = null;
    _uploadedUrl = null;
    notifyListeners();

    try {
      _uploadProgress = 0.5;
      notifyListeners();

      final url = await _uploadRepository.uploadToStorage(
        fileBytes: fileBytes,
        path: path,
        contentType: contentType,
      );

      _uploadProgress = 1.0;
      _uploadedUrl = url;
      _isUploading = false;
      notifyListeners();

      return url;
    } catch (e) {
      _error = e.toString();
      _isUploading = false;
      _uploadProgress = 0.0;
      notifyListeners();
      return null;
    }
  }

  // Eliminar archivo
  Future<bool> deleteFile(String filePath) async {
    _isUploading = true;
    _error = null;
    notifyListeners();

    try {
      await _uploadRepository.deleteFile(filePath);
      _isUploading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isUploading = false;
      notifyListeners();
      return false;
    }
  }

  // Reset estado
  void reset() {
    _isUploading = false;
    _uploadProgress = 0.0;
    _error = null;
    _uploadedUrl = null;
    notifyListeners();
  }
}


