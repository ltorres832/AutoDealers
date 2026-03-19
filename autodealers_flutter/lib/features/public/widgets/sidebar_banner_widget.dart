// Sidebar Banner Widget - Replica EXACTA de Next.js SidebarBanner.tsx
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/sponsored_content_provider.dart';

class SidebarBannerWidget extends StatefulWidget {
  const SidebarBannerWidget({super.key});

  @override
  State<SidebarBannerWidget> createState() => _SidebarBannerWidgetState();
}

class _SidebarBannerWidgetState extends State<SidebarBannerWidget> {
  final Set<String> _trackedImpressions = {};

  void _trackImpression(String contentId) {
    if (_trackedImpressions.contains(contentId)) return;
    _trackedImpressions.add(contentId);
    final provider = Provider.of<SponsoredContentProvider>(context, listen: false);
    provider.incrementImpression(contentId);
  }

  Future<void> _handleBannerClick(SponsoredContent banner) async {
    final provider = Provider.of<SponsoredContentProvider>(context, listen: false);
    provider.incrementClick(banner.id);
    
    if (banner.linkType == 'external') {
      final uri = Uri.parse(banner.linkUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } else {
      context.go(banner.linkUrl);
    }
  }

  void _handlePromoteClick() {
    context.go('/registro');
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SponsoredContentProvider>(
      builder: (context, provider, _) {
        // Si está cargando o no hay contenido, mostrar 2 banners promocionales
        if (provider.isLoading || provider.content.isEmpty) {
          return Column(
            children: [
              // Banner superior promocional
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF2563EB), // blue-600
                      Color(0xFF9333EA), // purple-600
                      Color(0xFFDB2777), // pink-600
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    // Overlay
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [
                              Colors.black.withOpacity(0.3),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Contenido
                    Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.campaign, color: Colors.white, size: 32),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Promociona Tu Negocio',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Llega a miles de compradores',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        GestureDetector(
                          onTap: _handlePromoteClick,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: const Text(
                              'Crear Anuncio',
                              style: TextStyle(
                                color: Color(0xFF2563EB),
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Banner inferior promocional
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF059669), // green-600
                      Color(0xFF0D9488), // emerald-600
                      Color(0xFF14B8A6), // teal-600
                    ],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    // Overlay
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [
                              Colors.black.withOpacity(0.3),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Contenido
                    Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.trending_up, color: Colors.white, size: 32),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Aumenta Tu Visibilidad',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Destaca entre la competencia',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        GestureDetector(
                          onTap: _handlePromoteClick,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.2),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: const Text(
                              'Crear Anuncio',
                              style: TextStyle(
                                color: Color(0xFF059669),
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          );
        }

        // Siempre mostrar los primeros 2 banners uno debajo del otro
        final firstBanner = provider.content.isNotEmpty ? provider.content[0] : null;
        final secondBanner = provider.content.length > 1 ? provider.content[1] : null;

        return Column(
          children: [
            // Banner superior - siempre el primero
            if (firstBanner != null)
              Builder(
                builder: (context) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _trackImpression(firstBanner.id);
                  });
                  return _BannerCard(
                    banner: firstBanner,
                    onTap: () => _handleBannerClick(firstBanner),
                    onPromoteTap: _handlePromoteClick,
                  );
                },
              )
            else
              // Banner promocional si no hay primero
              _PromotionalBanner(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF2563EB),
                    Color(0xFF9333EA),
                    Color(0xFFDB2777),
                  ],
                ),
                icon: Icons.campaign,
                title: 'Promociona Tu Negocio',
                description: 'Llega a miles de compradores',
                buttonColor: const Color(0xFF2563EB),
                onTap: _handlePromoteClick,
              ),
            const SizedBox(height: 16),
            // Banner inferior - siempre el segundo (o promocional si no hay)
            if (secondBanner != null)
              Builder(
                builder: (context) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _trackImpression(secondBanner.id);
                  });
                  return _BannerCard(
                    banner: secondBanner,
                    onTap: () => _handleBannerClick(secondBanner),
                    onPromoteTap: _handlePromoteClick,
                  );
                },
              )
            else
              // Banner promocional si no hay segundo
              _PromotionalBanner(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF059669),
                    Color(0xFF0D9488),
                    Color(0xFF14B8A6),
                  ],
                ),
                icon: Icons.trending_up,
                title: 'Aumenta Tu Visibilidad',
                description: 'Destaca entre la competencia',
                buttonColor: const Color(0xFF059669),
                onTap: _handlePromoteClick,
              ),
          ],
        );
      },
    );
  }
}

class _BannerCard extends StatelessWidget {
  final SponsoredContent banner;
  final VoidCallback onTap;
  final VoidCallback onPromoteTap;

  const _BannerCard({
    required this.banner,
    required this.onTap,
    required this.onPromoteTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFC084FC).withOpacity(0.5), width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen
            if (banner.imageUrl.isNotEmpty)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Stack(
                  children: [
                    Image.network(
                      banner.imageUrl,
                      width: double.infinity,
                      height: 192,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        height: 192,
                        color: Colors.grey.shade200,
                        child: const Center(
                          child: Icon(Icons.image, size: 48, color: Colors.grey),
                        ),
                      ),
                    ),
                    // Badge "PATROCINADO"
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF9333EA), // purple-600
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'PATROCINADO',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            // Contenido
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    banner.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF111827), // gray-900
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    banner.description,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  // Botón "Promociona Aquí"
                  GestureDetector(
                    onTap: onPromoteTap,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '📢 Promociona Aquí',
                        style: TextStyle(
                          color: Color(0xFF374151), // gray-700
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PromotionalBanner extends StatelessWidget {
  final Gradient gradient;
  final IconData icon;
  final String title;
  final String description;
  final Color buttonColor;
  final VoidCallback onTap;

  const _PromotionalBanner({
    required this.gradient,
    required this.icon,
    required this.title,
    required this.description,
    required this.buttonColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Colors.black.withOpacity(0.3),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Contenido
          Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.9),
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: onTap,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Text(
                    'Crear Anuncio',
                    style: TextStyle(
                      color: buttonColor,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}


