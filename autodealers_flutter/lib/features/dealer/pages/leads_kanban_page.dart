// Página de Kanban de Leads del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/lead.dart';
import '../widgets/dealer_drawer.dart';

class DealerLeadsKanbanPage extends StatefulWidget {
  const DealerLeadsKanbanPage({super.key});

  @override
  State<DealerLeadsKanbanPage> createState() => _DealerLeadsKanbanPageState();
}

class _DealerLeadsKanbanPageState extends State<DealerLeadsKanbanPage> {
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
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Kanban de Leads'),
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

          final statuses = [
            LeadStatus.new_,
            LeadStatus.contacted,
            LeadStatus.qualified,
            LeadStatus.closed,
            LeadStatus.lost,
          ];

          return Row(
            children: statuses.map((status) {
              final statusLeads = crmProvider.leads.where((lead) => lead.status == status).toList();
              return Expanded(
                child: Card(
                  margin: const EdgeInsets.all(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _getStatusName(status),
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            Chip(
                              label: Text('${statusLeads.length}'),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView.builder(
                          itemCount: statusLeads.length,
                          itemBuilder: (context, index) {
                            final lead = statusLeads[index];
                            return Card(
                              margin: const EdgeInsets.all(8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  child: Text(lead.contact.name[0].toUpperCase()),
                                ),
                                title: Text(lead.contact.name),
                                subtitle: Text(lead.contact.phone),
                                onTap: () {
                                  crmProvider.selectLead(lead);
                                  context.push('/leads/${lead.id}');
                                },
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  String _getStatusName(LeadStatus status) {
    switch (status) {
      case LeadStatus.new_:
        return 'Nuevo';
      case LeadStatus.contacted:
        return 'Contactado';
      case LeadStatus.qualified:
        return 'Calificado';
      case LeadStatus.closed:
        return 'Cerrado';
      case LeadStatus.lost:
        return 'Perdido';
      default:
        return 'Desconocido';
    }
  }
}


