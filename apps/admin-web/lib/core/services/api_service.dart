// Servicio para consumir las APIs REST existentes
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Obtiene el token de autenticación de Firebase
  Future<String?> _getAuthToken() async {
    final user = _auth.currentUser;
    if (user == null) return null;
    return await user.getIdToken();
  }

  // GET request
  Future<Map<String, dynamic>> get(String endpoint, {Map<String, String>? queryParams}) async {
    final token = await _getAuthToken();
    var uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    
    if (queryParams != null) {
      uri = uri.replace(queryParameters: queryParams);
    }

    final response = await http.get(
      uri,
      headers: ApiConfig.getHeaders(token),
    );

    if (response.statusCode == 200) {
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Error: ${response.statusCode} - ${response.body}');
    }
  }

  // POST request
  Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> data) async {
    final token = await _getAuthToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    final response = await http.post(
      uri,
      headers: ApiConfig.getHeaders(token),
      body: json.encode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Error: ${response.statusCode} - ${response.body}');
    }
  }

  // PUT request
  Future<Map<String, dynamic>> put(String endpoint, Map<String, dynamic> data) async {
    final token = await _getAuthToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    final response = await http.put(
      uri,
      headers: ApiConfig.getHeaders(token),
      body: json.encode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Error: ${response.statusCode} - ${response.body}');
    }
  }

  // DELETE request
  Future<void> delete(String endpoint) async {
    final token = await _getAuthToken();
    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');

    final response = await http.delete(
      uri,
      headers: ApiConfig.getHeaders(token),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Error: ${response.statusCode} - ${response.body}');
    }
  }
}


