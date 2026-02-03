import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/leads_service.dart';
import '../../../core/models/lead.dart';
import 'package:intl/intl.dart';

/// Página completa de Leads con sincronización en tiempo real
class LeadsPageComplete extends StatefulWidget {
  const LeadsPageComplete({super.key});

  @override
  State<LeadsPageComplete> createState() => _LeadsPageCompleteState();
}

class _LeadsPageCompleteState extends State<LeadsPageComplete> {
  final LeadsService _leadsService = LeadsService();
  String? _filterStatus;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateLeadDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de búsqueda
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar leads...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value.toLowerCase());
              },
            ),
          ),

          // Filtros activos
          if (_filterStatus != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.blue.shade50,
              child: Row(
                children: [
                  Chip(
                    label: Text('Estado: $_filterStatus'),
                    onDeleted: () {
                      setState(() => _filterStatus = null);
                    },
                  ),
                ],
              ),
            ),

          // Lista de leads
          Expanded(
            child: StreamBuilder<List<Lead>>(
              stream: _leadsService.watchLeads(status: _filterStatus),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error: ${snapshot.error}'),
                  );
                }

                final leads = snapshot.data ?? [];
                final filteredLeads = _searchQuery.isEmpty
                    ? leads
                    : leads.where((lead) {
                        return lead.contact.name
                                .toLowerCase()
                                .contains(_searchQuery) ||
                            lead.contact.phone.contains(_searchQuery) ||
                            (lead.contact.email?.toLowerCase().contains(_searchQuery) ??
                                false) ||
                            lead.source.toLowerCase().contains(_searchQuery);
                      }).toList();

                if (filteredLeads.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          'No hay leads',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: filteredLeads.length,
                  padding: const EdgeInsets.all(16),
                  itemBuilder: (context, index) {
                    final lead = filteredLeads[index];
                    return _LeadCard(
                      lead: lead,
                      onTap: () => context.push('/leads/${lead.id}'),
                      onStatusChange: (newStatus) {
                        _leadsService.updateLeadStatus(lead.id, newStatus);
                      },
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

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filtrar Leads'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Todos'),
              leading: Radio<String?>(
                value: null,
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Nuevo'),
              leading: Radio<String?>(
                value: 'new',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Contactado'),
              leading: Radio<String?>(
                value: 'contacted',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Calificado'),
              leading: Radio<String?>(
                value: 'qualified',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Cerrado'),
              leading: Radio<String?>(
                value: 'closed',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateLeadDialog() {
    // TODO: Implementar modal de crear lead
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Crear Lead'),
        content: const Text('Funcionalidad en desarrollo'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}

class _LeadCard extends StatelessWidget {
  final Lead lead;
  final VoidCallback onTap;
  final Function(String) onStatusChange;

  const _LeadCard({
    required this.lead,
    required this.onTap,
    required this.onStatusChange,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      lead.contact.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  _StatusChip(status: lead.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.phone, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text(
                    lead.contact.phone,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
              if (lead.contact.email != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.email, size: 16, color: Colors.grey[600]),
                    const SizedBox(width: 8),
                    Text(
                      lead.contact.email!,
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Chip(
                    label: Text(lead.source),
                    avatar: const Icon(Icons.source, size: 16),
                  ),
                  Text(
                    DateFormat('dd/MM/yyyy').format(lead.createdAt),
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  Color get _statusColor {
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

  String get _statusLabel {
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
        _statusLabel,
        style: const TextStyle(color: Colors.white, fontSize: 12),
      ),
      backgroundColor: _statusColor,
    );
  }
}


