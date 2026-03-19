// Página de Leads del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/data/services/firestore_service.dart';
import '../../../core/domain/models/lead.dart';
import '../widgets/dealer_drawer.dart';

class DealerLeadsPage extends StatefulWidget {
  const DealerLeadsPage({super.key});

  @override
  State<DealerLeadsPage> createState() => _DealerLeadsPageState();
}

class _DealerLeadsPageState extends State<DealerLeadsPage> {
  String _statusFilter = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final authProvider = context.read<AuthProvider>();
      final crmProvider = context.read<CrmProvider>();
      String? tenantId = authProvider.user?.tenantId;
      if (tenantId == null || tenantId.isEmpty) {
        tenantId = await FirestoreService().getCurrentTenantId();
      }
      if (tenantId != null && mounted) {
        crmProvider.initialize(tenantId);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/leads/create'),
          ),
          IconButton(
            icon: const Icon(Icons.view_kanban),
            onPressed: () => context.push('/dealer/leads/kanban'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Buscar',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _statusFilter.isEmpty ? null : _statusFilter,
                  hint: const Text('Estado'),
                  items: const [
                    DropdownMenuItem(value: 'new', child: Text('Nuevo')),
                    DropdownMenuItem(value: 'contacted', child: Text('Contactado')),
                    DropdownMenuItem(value: 'qualified', child: Text('Calificado')),
                    DropdownMenuItem(value: 'closed', child: Text('Cerrado')),
                    DropdownMenuItem(value: 'lost', child: Text('Perdido')),
                  ],
                  onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                ),
              ],
            ),
          ),
          // Lista de leads
          Expanded(
            child: Consumer<CrmProvider>(
              builder: (context, crmProvider, _) {
                if (crmProvider.isLoading && crmProvider.leads.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (crmProvider.error != null) {
                  return Center(
                    child: Text('Error: ${crmProvider.error}'),
                  );
                }

                var filteredLeads = crmProvider.leads;
                if (_statusFilter.isNotEmpty) {
                  filteredLeads = filteredLeads.where((lead) {
                    return lead.status.name == _statusFilter;
                  }).toList();
                }

                if (_searchController.text.isNotEmpty) {
                  final searchLower = _searchController.text.toLowerCase();
                  filteredLeads = filteredLeads.where((lead) {
                    return lead.contact.name.toLowerCase().contains(searchLower) ||
                        lead.contact.phone.contains(searchLower) ||
                        (lead.contact.email?.toLowerCase() ?? '').contains(searchLower);
                  }).toList();
                }

                if (filteredLeads.isEmpty) {
                  return const Center(
                    child: Text('No hay leads disponibles'),
                  );
                }

                return ListView.builder(
                  itemCount: filteredLeads.length,
                  itemBuilder: (context, index) {
                    final lead = filteredLeads[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Text(lead.contact.name[0].toUpperCase()),
                        ),
                        title: Text(lead.contact.name),
                        subtitle: Text('${lead.contact.phone} • ${lead.status.name}'),
                        trailing: Icon(_getStatusIcon(lead.status)),
                        onTap: () {
                          crmProvider.selectLead(lead);
                          context.push('/dealer/leads/${lead.id}');
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
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


