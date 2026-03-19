// Página de Todos los Leads (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/domain/models/lead.dart';

class AdminAllLeadsPage extends StatefulWidget {
  const AdminAllLeadsPage({super.key});

  @override
  State<AdminAllLeadsPage> createState() => _AdminAllLeadsPageState();
}

class _AdminAllLeadsPageState extends State<AdminAllLeadsPage> {
  String _statusFilter = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CrmProvider>().loadLeads();
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
      appBar: AppBar(
        title: const Text('Todos los Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.view_kanban),
            onPressed: () => context.push('/admin/all-leads/kanban'),
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/leads/create'),
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
                          context.push('/leads/${lead.id}');
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


