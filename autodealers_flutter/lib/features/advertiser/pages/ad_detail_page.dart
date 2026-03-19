// Detalle de un anuncio (Advertiser)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/advertiser_provider.dart';

class AdvertiserAdDetailPage extends StatefulWidget {
  const AdvertiserAdDetailPage({super.key, required this.adId});
  final String adId;

  @override
  State<AdvertiserAdDetailPage> createState() => _AdvertiserAdDetailPageState();
}

class _AdvertiserAdDetailPageState extends State<AdvertiserAdDetailPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdvertiserProvider>().loadAd(widget.adId);
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
        title: const Text('Detalle del anuncio'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Consumer<AdvertiserProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.selectedAd == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.error != null && provider.selectedAd == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${provider.error}', textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadAd(widget.adId),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          final ad = provider.selectedAd;
          if (ad == null) {
            return const Center(child: Text('Anuncio no encontrado'));
          }
          final status = ad['status'] as String? ?? '';
          final canPauseResume = status == 'active' || status == 'paused';
          final title = ad['title'] as String? ?? 'Sin título';
          final imageUrl = ad['imageUrl'] as String?;
          final linkUrl = ad['linkUrl'] as String? ?? '';
          final startDate = ad['startDate'];
          final endDate = ad['endDate'];
          final impressions = ad['impressions'] ?? 0;
          final clicks = ad['clicks'] ?? 0;
          final ctr = ad['ctr'] ?? 0.0;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (imageUrl != null && imageUrl.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      imageUrl,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox(
                        height: 180,
                        child: Center(child: Icon(Icons.broken_image, size: 48)),
                      ),
                    ),
                  )
                else
                  const SizedBox(
                    height: 120,
                    child: Center(child: Icon(Icons.campaign, size: 64, color: Colors.grey)),
                  ),
                const SizedBox(height: 16),
                Text(title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Chip(label: Text(_statusLabel(status))),
                const SizedBox(height: 16),
                Text('Impresiones: $impressions • Clics: $clicks • CTR: ${ctr.toStringAsFixed(2)}%'),
                if (linkUrl.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  SelectableText('Enlace: $linkUrl', style: const TextStyle(fontSize: 12)),
                ],
                if (startDate != null || endDate != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Vigencia: ${startDate != null ? _formatDate(startDate) : '—'} - ${endDate != null ? _formatDate(endDate) : '—'}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
                if (canPauseResume) ...[
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () async {
                      final ok = await provider.pauseResumeAd(widget.adId, status != 'paused');
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(ok ? 'Anuncio actualizado' : 'Error: ${provider.error}')),
                        );
                        if (ok) provider.loadAd(widget.adId);
                      }
                    },
                    icon: Icon(status == 'paused' ? Icons.play_arrow : Icons.pause),
                    label: Text(status == 'paused' ? 'Reanudar' : 'Pausar'),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatDate(dynamic d) {
    if (d is DateTime) return '${d.day}/${d.month}/${d.year}';
    if (d is String) return d.length > 10 ? d.substring(0, 10) : d;
    return '$d';
  }
}


