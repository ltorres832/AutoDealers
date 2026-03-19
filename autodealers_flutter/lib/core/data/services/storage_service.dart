// Servicio de Storage para Firebase Storage
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/firebase_config.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseConfig.storage;

  // Subir imagen
  Future<String> uploadImage({
    required File file,
    required String path,
    String? tenantId,
  }) async {
    try {
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';
      final fullPath = tenantId != null
          ? 'tenants/$tenantId/$path/$fileName'
          : '$path/$fileName';

      final ref = _storage.ref().child(fullPath);
      await ref.putFile(file);

      return await ref.getDownloadURL();
    } catch (e) {
      throw Exception('Error al subir imagen: $e');
    }
  }

  // Subir múltiples imágenes
  Future<List<String>> uploadImages({
    required List<File> files,
    required String path,
    String? tenantId,
  }) async {
    final urls = <String>[];
    for (final file in files) {
      final url = await uploadImage(file: file, path: path, tenantId: tenantId);
      urls.add(url);
    }
    return urls;
  }

  // Subir imagen desde ImagePicker
  Future<String> uploadImageFromPicker({
    required ImageSource source,
    required String path,
    String? tenantId,
  }) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);

    if (pickedFile == null) {
      throw Exception('No se seleccionó ninguna imagen');
    }

    return await uploadImage(
      file: File(pickedFile.path),
      path: path,
      tenantId: tenantId,
    );
  }

  // Eliminar imagen
  Future<void> deleteImage(String url) async {
    try {
      final ref = _storage.refFromURL(url);
      await ref.delete();
    } catch (e) {
      throw Exception('Error al eliminar imagen: $e');
    }
  }

  // Eliminar múltiples imágenes
  Future<void> deleteImages(List<String> urls) async {
    for (final url in urls) {
      await deleteImage(url);
    }
  }

  // Subir documento
  Future<String> uploadDocument({
    required File file,
    required String path,
    String? tenantId,
  }) async {
    try {
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';
      final fullPath = tenantId != null
          ? 'tenants/$tenantId/$path/$fileName'
          : '$path/$fileName';

      final ref = _storage.ref().child(fullPath);
      await ref.putFile(file);

      return await ref.getDownloadURL();
    } catch (e) {
      throw Exception('Error al subir documento: $e');
    }
  }
}


