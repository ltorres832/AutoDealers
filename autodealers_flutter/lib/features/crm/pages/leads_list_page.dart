// Página de Lista de Leads
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/lead.dart';

class LeadsListPage extends StatefulWidget {
  const LeadsListPage({super.key});

  @override
  State<LeadsListPage> createState() => _LeadsListPageState();
}

class _LeadsListPageState extends State<LeadsListPage> {
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
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/leads/create'),
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

          if (crmProvider.leads.isEmpty) {
            return const Center(
              child: Text('No hay leads disponibles'),
            );
          }

          return ListView.builder(
            itemCount: crmProvider.leads.length,
            itemBuilder: (context, index) {
              final lead = crmProvider.leads[index];
              return ListTile(
                leading: CircleAvatar(
                  child: Text(lead.contact.name[0].toUpperCase()),
                ),
                title: Text(lead.contact.name),
                subtitle: Text('${lead.contact.phone} • ${lead.status.name}'),
                trailing: Icon(_getStatusIcon(lead.status)),
                onTap: () {
                  crmProvider.selectLead(lead);
                  context.push('/leads/${lead.id}');
                },
              );
            },
          );
        },
      ),
    );
  }

  IconData _getStatusIcon(LeadStatus status) {
    switch (status) {
      case LeadStatus.new_:
        return Icons.new_releases;
      case LeadStatus.contacted:
        return Icons.phone;
      case LeadStatus.qualified:
        return Icons.check_circle;
      case LeadStatus.closed:
        return Icons.done;
      case LeadStatus.lost:
        return Icons.cancel;
      default:
        return Icons.info;
    }
  }
}


