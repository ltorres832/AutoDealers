// Página de Gestión de Campañas (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/campaigns_provider.dart';

class AdminCampaignsPage extends StatelessWidget {
  const AdminCampaignsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Campañas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/campaigns/create'),
          ),
        ],
      ),
      body: Consumer<CampaignsProvider>(
        builder: (context, campaignsProvider, _) {
          if (campaignsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (campaignsProvider.campaigns.isEmpty) {
            return const Center(child: Text('No hay campañas'));
          }

          return ListView.builder(
            itemCount: campaignsProvider.campaigns.length,
            itemBuilder: (context, index) {
              final campaign = campaignsProvider.campaigns[index];
              return ListTile(
                title: Text(campaign['name'] ?? 'Sin nombre'),
                subtitle: Text(campaign['status'] ?? ''),
                trailing: IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => context.push('/admin/campaigns/${campaign['id']}/edit'),
                ),
                onTap: () => context.push('/admin/campaigns/${campaign['id']}'),
              );
            },
          );
        },
      ),
    );
  }
}


