import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../../core/config/firebase_config.dart';
import '../../auth/providers/auth_provider.dart';

/// Base URL del backend (dealer por defecto). Producción: --dart-define=API_BASE_URL=...
const _apiBase = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3002');

class SettingsTemplatesPage extends StatelessWidget {
  const SettingsTemplatesPage({super.key});

  Future<void> _initialize(BuildContext context, String tenantId) async {
    try {
      final token = await FirebaseConfig.auth.currentUser?.getIdToken();
      final res = await http.post(
        Uri.parse('$_apiBase/api/settings/templates/initialize'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final count = body['count'] ?? 0;
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Templates inicializados. Se crearon $count.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception(body['error'] ?? body['message'] ?? 'Error');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenantId = context.watch<AuthProvider>().userData?['tenantId']?.toString();

    if (tenantId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Plantillas')),
        body: const Center(child: Text('Sesión sin tenant')),
      );
    }

    final stream = FirebaseConfig.firestore
        .collection('templates')
        .where('tenantId', isEqualTo: tenantId)
        .snapshots();

    return Scaffold(
      appBar: AppBar(title: const Text('Plantillas')),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: stream,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final docs = snapshot.data!.docs;
          if (docs.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No hay plantillas'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => _initialize(context, tenantId),
                    child: const Text('Inicializar plantillas por defecto'),
                  ),
                ],
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              OutlinedButton(
                onPressed: () => _initialize(context, tenantId),
                child: const Text('Inicializar plantillas por defecto'),
              ),
              const SizedBox(height: 12),
              ...docs.map((d) {
                final data = d.data();
                return ListTile(
                  title: Text(data['name']?.toString() ?? 'Plantilla'),
                  subtitle: Text('${data['type']} · ${data['category']}'),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}
