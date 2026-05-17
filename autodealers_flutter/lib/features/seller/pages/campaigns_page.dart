// Página de Campañas del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/campaigns_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerCampaignsPage extends StatelessWidget {
  const SellerCampaignsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Campañas'),
      ),
      body: Consumer<CampaignsProvider>(
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
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    campaignsProvider.selectCampaign(campaign);
                    context.push('/admin/campaigns/${campaign['id']}');
                  },
                ),
              );
            },
          );
        },
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


