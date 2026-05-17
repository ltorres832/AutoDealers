import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../config/firebase_config.dart';

enum TenantApp { dealer, seller }

class TenantApiRepository {
  TenantApiRepository(this.app);

  final TenantApp app;

  String get _base =>
      app == TenantApp.seller ? kSellerApiBaseUrl : kDealerApiBaseUrl;

  Future<String?> _getIdToken() async {
    return FirebaseConfig.auth.currentUser?.getIdToken();
  }

  Future<Map<String, String>> _headers() async {
    final token = await _getIdToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// POST /api/settings/templates/initialize
  Future<Map<String, dynamic>> initializeDefaultTemplates() async {
    final res = await http.post(
      Uri.parse('$_base/api/settings/templates/initialize'),
      headers: await _headers(),
    );

    Map<String, dynamic> body = {};
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception(
        'Respuesta no válida del servidor (${res.statusCode})',
      );
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        body['error']?.toString() ??
            body['message']?.toString() ??
            'Error al inicializar templates',
      );
    }

    return body;
  }
}
