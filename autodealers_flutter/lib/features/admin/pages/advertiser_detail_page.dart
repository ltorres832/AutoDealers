// Página de Detalle de Anunciante (Admin)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminAdvertiserDetailPage extends StatelessWidget {
  final String advertiserId;

  const AdminAdvertiserDetailPage({super.key, required this.advertiserId});

  Widget _buildInfoTab(String advertiserId) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Información del Anunciante',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('ID: $advertiserId'),
                  const SizedBox(height: 8),
                  const Text('Nombre: [Cargando...]'),
                  const SizedBox(height: 8),
                  const Text('Email: [Cargando...]'),
                  const SizedBox(height: 8),
                  const Text('Estado: [Cargando...]'),
                  const SizedBox(height: 8),
                  const Text('Plan: [Cargando...]'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Nota: Esta información se carga desde una Cloud Function de administración.',
            style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }

  Widget _buildAdsTab(String advertiserId) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.campaign, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'Anuncios del Anunciante',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Esta funcionalidad requiere una Cloud Function\nde administración para listar los anuncios.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildBillingTab(String advertiserId) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.payment, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'Facturación del Anunciante',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Esta funcionalidad requiere una Cloud Function\nde administración para ver la facturación.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle de Anunciante'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.push('/admin/advertisers/$advertiserId/edit'),
          ),
        ],
      ),
      body: DefaultTabController(
        length: 3,
        child: Column(
          children: [
            const TabBar(
              tabs: [
                Tab(text: 'Información'),
                Tab(text: 'Anuncios'),
                Tab(text: 'Facturación'),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildInfoTab(advertiserId),
                  _buildAdsTab(advertiserId),
                  _buildBillingTab(advertiserId),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}


