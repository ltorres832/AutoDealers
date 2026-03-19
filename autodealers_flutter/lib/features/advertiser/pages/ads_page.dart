// Página de Anuncios del Advertiser - listado y pausar/reanudar
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/advertiser_provider.dart';

class AdvertiserAdsPage extends StatefulWidget {
  const AdvertiserAdsPage({super.key});

  @override
  State<AdvertiserAdsPage> createState() => _AdvertiserAdsPageState();
}

class _AdvertiserAdsPageState extends State<AdvertiserAdsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdvertiserProvider>().loadAdvertiser();
      context.read<AdvertiserProvider>().loadAds();
    });
  }

  static String _statusLabel(String? status) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobado';
      case 'active': return 'Activo';
      case 'paused': return 'Pausado';
      case 'expired': return 'Expirado';
      case 'rejected': return 'Rechazado';
      case 'payment_pending': return 'Pago pendiente';
      default: return status ?? '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Anuncios'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go('/advertiser/ads/create'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<AdvertiserProvider>().loadAds();
            },
          ),
        ],
      ),
      body: Consumer<AdvertiserProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.ads.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${provider.error}', textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      provider.loadAdvertiser();
                      provider.loadAds();
                    },
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          if (provider.ads.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.campaign, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No tienes anuncios'),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/advertiser/ads/create'),
                    icon: const Icon(Icons.add),
                    label: const Text('Crear anuncio'),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => provider.loadAds(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: provider.ads.length,
              itemBuilder: (context, index) {
                final ad = provider.ads[index];
                final id = ad['id'] as String? ?? '';
                final status = ad['status'] as String? ?? '';
                final title = ad['title'] as String? ?? 'Sin título';
                final canPauseResume = status == 'active' || status == 'paused';
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: ad['imageUrl'] != null && (ad['imageUrl'] as String).isNotEmpty
                        ? Image.network(
                            ad['imageUrl'] as String,
                            width: 56,
                            height: 56,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(Icons.campaign, size: 40),
                          )
                        : const Icon(Icons.campaign, size: 40),
                    title: Text(title),
                    subtitle: Text(
                      '${_statusLabel(status)} • Imp: ${ad['impressions'] ?? 0} • Clics: ${ad['clicks'] ?? 0}',
                    ),
                    trailing: canPauseResume
                        ? IconButton(
                            icon: Icon(status == 'paused' ? Icons.play_arrow : Icons.pause),
                            onPressed: () async {
                              final ok = await provider.pauseResumeAd(id, status != 'paused');
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(ok ? 'Anuncio actualizado' : 'Error: ${provider.error}'),
                                  ),
                                );
                              }
                            },
                          )
                        : Chip(label: Text(_statusLabel(status))),
                    onTap: () => context.push('/advertiser/ads/$id'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

