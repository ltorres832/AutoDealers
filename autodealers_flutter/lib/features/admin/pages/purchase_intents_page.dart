// Página de Intenciones de Compra (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminPurchaseIntentsPage extends StatefulWidget {
  const AdminPurchaseIntentsPage({super.key});

  @override
  State<AdminPurchaseIntentsPage> createState() => _AdminPurchaseIntentsPageState();
}

class _AdminPurchaseIntentsPageState extends State<AdminPurchaseIntentsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final crmProvider = context.read<CrmProvider>();
      if (authProvider.user?.tenantId != null) {
        crmProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Intenciones de Compra'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final authProvider = context.read<AuthProvider>();
              final crmProvider = context.read<CrmProvider>();
              if (authProvider.user?.tenantId != null) {
                crmProvider.loadLeads();
              }
            },
          ),
        ],
      ),
      body: Consumer<CrmProvider>(
        builder: (context, crmProvider, _) {
          if (crmProvider.isLoading && crmProvider.leads.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (crmProvider.error != null) {
            return Center(
              child: Text('Error: ${crmProvider.error}'),
            );
          }

          // Filtrar leads con alta intención de compra (qualified o con interacciones recientes)
          final purchaseIntents = crmProvider.leads.where((lead) {
            return lead.status.name == 'qualified' || lead.interactions.isNotEmpty;
          }).toList();

          if (purchaseIntents.isEmpty) {
            return const Center(
              child: Text('No hay intenciones de compra identificadas'),
            );
          }

          return ListView.builder(
            itemCount: purchaseIntents.length,
            itemBuilder: (context, index) {
              final lead = purchaseIntents[index];
              final intentScore = _calculateIntentScore(lead);
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getIntentColor(intentScore),
                    child: Text(
                      '${(intentScore * 100).toInt()}%',
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                  title: Text(lead.contact.name),
                  subtitle: Text(
                    '${lead.contact.phone} • ${lead.interactions.length} interacciones',
                  ),
                  trailing: Chip(
                    label: Text(lead.status.name),
                    backgroundColor: _getStatusColor(lead.status.name),
                  ),
                  onTap: () {
                    crmProvider.selectLead(lead);
                    context.go('/leads/${lead.id}');
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  double _calculateIntentScore(lead) {
    double score = 0.0;
    if (lead.status.name == 'qualified') score += 0.5;
    score += (lead.interactions.length * 0.1).clamp(0.0, 0.5);
    return score.clamp(0.0, 1.0);
  }

  Color _getIntentColor(double score) {
    if (score >= 0.7) return Colors.green;
    if (score >= 0.4) return Colors.orange;
    return Colors.red;
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'qualified':
        return Colors.green.shade100;
      case 'contacted':
        return Colors.blue.shade100;
      default:
        return Colors.grey.shade100;
    }
  }
}


