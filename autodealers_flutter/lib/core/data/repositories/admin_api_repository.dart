// Llamadas HTTP al backend Admin (Next.js) para crear usuario, tenant y membresía
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../config/firebase_config.dart';

class AdminApiRepository {
  String get _base => kAdminApiBaseUrl;

  Future<String?> _getIdToken() async {
    return await FirebaseConfig.auth.currentUser?.getIdToken();
  }

  Future<Map<String, String>> _headers() async {
    final token = await _getIdToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// POST /api/admin/users - body: email, password, name, role, tenantId?
  Future<Map<String, dynamic>?> createUser(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$_base/api/admin/users'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    if (res.statusCode != 201 && res.statusCode != 200) return null;
    final data = jsonDecode(res.body) as Map<String, dynamic>?;
    return data;
  }

  /// POST /api/admin/tenants - body: name, type, subdomain, companyName?
  Future<Map<String, dynamic>?> createTenant(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$_base/api/admin/tenants'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    if (res.statusCode != 201 && res.statusCode != 200) return null;
    return jsonDecode(res.body) as Map<String, dynamic>?;
  }

  /// POST /api/admin/memberships - body: name, type, price, currency?, billingCycle?, features?, isActive?
  Future<Map<String, dynamic>?> createMembership(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$_base/api/admin/memberships'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    if (res.statusCode != 201 && res.statusCode != 200) return null;
    return jsonDecode(res.body) as Map<String, dynamic>?;
  }
}


