// Página de Campañas del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/campaigns_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerCampaignsPage extends StatefulWidget {
  const DealerCampaignsPage({super.key});

  @override
  State<DealerCampaignsPage> createState() => _DealerCampaignsPageState();
}

class _DealerCampaignsPageState extends State<DealerCampaignsPage> {
  String _statusFilter = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final campaignsProvider = context.read<CampaignsProvider>();
      if (authProvider.user?.tenantId != null) {
        campaignsProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Campañas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/campaigns/create'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: DropdownButtonFormField<String>(
              value: _statusFilter.isEmpty ? null : _statusFilter,
              decoration: const InputDecoration(
                labelText: 'Estado',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'draft', child: Text('Borrador')),
                DropdownMenuItem(value: 'active', child: Text('Activa')),
                DropdownMenuItem(value: 'paused', child: Text('Pausada')),
                DropdownMenuItem(value: 'completed', child: Text('Completada')),
              ],
              onChanged: (value) {
                setState(() => _statusFilter = value ?? '');
                final authProvider = context.read<AuthProvider>();
                final campaignsProvider = context.read<CampaignsProvider>();
                if (authProvider.user?.tenantId != null) {
                  campaignsProvider.loadCampaigns(status: _statusFilter.isEmpty ? null : _statusFilter);
                }
              },
            ),
          ),
          // Lista de campañas
          Expanded(
            child: Consumer<CampaignsProvider>(
              builder: (context, campaignsProvider, _) {
                if (campaignsProvider.isLoading && campaignsProvider.campaigns.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (campaignsProvider.error != null) {
                  return Center(
                    child: Text('Error: ${campaignsProvider.error}'),
                  );
                }

                if (campaignsProvider.campaigns.isEmpty) {
                  return const Center(
                    child: Text('No hay campañas disponibles'),
                  );
                }

                return ListView.builder(
                  itemCount: campaignsProvider.campaigns.length,
                  itemBuilder: (context, index) {
                    final campaign = campaignsProvider.campaigns[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getStatusColor(campaign['status']),
                          child: Icon(
                            _getStatusIcon(campaign['status']),
                            color: Colors.white,
                          ),
                        ),
                        title: Text(campaign['name'] ?? 'Sin nombre'),
                        subtitle: Text(
                          '${campaign['platform'] ?? 'N/A'} • ${campaign['status'] ?? 'unknown'}',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (campaign['status'] == 'active')
                              IconButton(
                                icon: const Icon(Icons.pause),
                                onPressed: () async {
                                  final ok = await campaignsProvider.updateCampaign(
                                    campaign['id'] as String,
                                    {'status': 'paused'},
                                  );
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ok ? 'Campaña pausada' : 'Error: ${campaignsProvider.error}')),
                                    );
                                  }
                                },
                              ),
                            IconButton(
                              icon: const Icon(Icons.chevron_right),
                              onPressed: () {
                                campaignsProvider.selectCampaign(campaign);
                                context.push('/admin/campaigns/${campaign['id']}');
                              },
                            ),
                          ],
                        ),
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

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'paused':
        return Colors.orange;
      case 'completed':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String? status) {
    switch (status) {
      case 'active':
        return Icons.play_arrow;
      case 'paused':
        return Icons.pause;
      case 'completed':
        return Icons.check_circle;
      default:
        return Icons.edit_note;
    }
  }
}


