import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/config/firebase_config.dart';
import '../../auth/providers/auth_provider.dart';

class CustomerFilesPage extends StatelessWidget {
  const CustomerFilesPage({super.key});

  String _name(Map<String, dynamic> data) {
    final info = data['customerInfo'];
    if (info is Map && info['fullName'] != null) {
      return info['fullName'].toString();
    }
    return 'Sin nombre';
  }

  @override
  Widget build(BuildContext context) {
    final tenantId = context.watch<AuthProvider>().userData?['tenantId']?.toString();

    if (tenantId == null || tenantId.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Casos de Cliente')),
        body: const Center(child: Text('No se encontró el tenant del usuario')),
      );
    }

    final stream = FirebaseConfig.firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('customer_files')
        .orderBy('updatedAt', descending: true)
        .limit(100)
        .snapshots();

    return Scaffold(
      appBar: AppBar(title: const Text('Casos de Cliente')),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: stream,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final docs = snapshot.data!.docs;
          if (docs.isEmpty) {
            return const Center(child: Text('No hay casos de cliente'));
          }
          return ListView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final doc = docs[index];
              final data = doc.data();
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.folder_open),
                  title: Text(_name(data)),
                  subtitle: Text('Estado: ${data['status'] ?? '—'}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
