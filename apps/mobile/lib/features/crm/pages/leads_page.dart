import 'package:flutter/material.dart';
import 'leads_page_complete.dart';

/// Página de Leads que usa la implementación completa
class LeadsPage extends StatelessWidget {
  const LeadsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const LeadsPageComplete();
  }
}

// Código antiguo mantenido para referencia
class _OldLeadsPage extends StatelessWidget {
  const _OldLeadsPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // TODO: Navegar a crear lead
            },
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseConfig.firestore
            .collection('tenants')
            .doc('tenant-id') // TODO: Obtener del usuario autenticado
            .collection('leads')
            .orderBy('createdAt', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Text('Error: ${snapshot.error}'),
            );
          }

          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return const Center(
              child: Text('No hay leads disponibles'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: snapshot.data!.docs.length,
            itemBuilder: (context, index) {
              final doc = snapshot.data!.docs[index];
              final data = doc.data() as Map<String, dynamic>;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text(
                      data['contact']?['name']?[0]?.toUpperCase() ?? '?',
                    ),
                  ),
                  title: Text(data['contact']?['name'] ?? 'Sin nombre'),
                  subtitle: Text(data['contact']?['phone'] ?? ''),
                  trailing: _StatusChip(status: data['status'] ?? 'new'),
                  onTap: () {
                    context.push('/leads/${doc.id}');
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  Color get _color {
    switch (status) {
      case 'new':
        return Colors.blue;
      case 'contacted':
        return Colors.orange;
      case 'qualified':
        return Colors.green;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String get _label {
    switch (status) {
      case 'new':
        return 'Nuevo';
      case 'contacted':
        return 'Contactado';
      case 'qualified':
        return 'Calificado';
      case 'closed':
        return 'Cerrado';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(
        _label,
        style: const TextStyle(fontSize: 12, color: Colors.white),
      ),
      backgroundColor: _color,
      padding: const EdgeInsets.symmetric(horizontal: 8),
    );
  }
}




