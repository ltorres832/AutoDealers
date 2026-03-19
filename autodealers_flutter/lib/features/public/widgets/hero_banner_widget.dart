// Hero Banner - Versión simple y estable (sin overflow)
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/sponsored_content_provider.dart';

class HeroBannerWidget extends StatefulWidget {
  const HeroBannerWidget({super.key});

  @override
  State<HeroBannerWidget> createState() => _HeroBannerWidgetState();
}

class _HeroBannerWidgetState extends State<HeroBannerWidget> {
  int _currentIndex = 0;
  bool _isPaused = false;
  Timer? _rotationTimer;
  final Set<String> _trackedImpressions = {};
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startAutoRotation();
      try {
        final provider = Provider.of<SponsoredContentProvider>(context, listen: false);
        if (provider.content.isNotEmpty) {
          _trackImpression(provider.content[0].id);
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _rotationTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _startAutoRotation() {
    _rotationTimer?.cancel();
    if (!mounted) return;
    try {
      final provider = Provider.of<SponsoredContentProvider>(context, listen: false);
      if (provider.content.length <= 1 || _isPaused) return;
      _rotationTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
        if (!mounted || _isPaused) {
          timer.cancel();
          return;
        }
        try {
          final p = Provider.of<SponsoredContentProvider>(context, listen: false);
          if (p.content.length <= 1) {
            timer.cancel();
            return;
          }
          final nextIndex = (_currentIndex + 1) % p.content.length;
          _pageController.animateToPage(
            nextIndex,
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeInOut,
          );
          setState(() => _currentIndex = nextIndex);
          _trackImpression(p.content[nextIndex].id);
        } catch (_) {}
      });
    } catch (_) {}
  }

  void _trackImpression(String contentId) {
    if (_trackedImpressions.contains(contentId)) return;
    _trackedImpressions.add(contentId);
    try {
      Provider.of<SponsoredContentProvider>(context, listen: false).incrementImpression(contentId);
    } catch (_) {}
  }

  void _goToSlide(int index) {
    _pageController.animateToPage(index, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    setState(() {
      _currentIndex = index;
      _isPaused = true;
    });
    _rotationTimer?.cancel();
    Future.delayed(const Duration(seconds: 8), () {
      if (mounted) {
        setState(() => _isPaused = false);
        _startAutoRotation();
      }
    });
  }

  void _nextSlide() {
    try {
      final p = Provider.of<SponsoredContentProvider>(context, listen: false);
      final next = (_currentIndex + 1) % p.content.length;
      _pageController.animateToPage(next, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
      setState(() => _currentIndex = next);
    } catch (_) {}
  }

  void _prevSlide() {
    try {
      final p = Provider.of<SponsoredContentProvider>(context, listen: false);
      final prev = (_currentIndex - 1 + p.content.length) % p.content.length;
      _pageController.animateToPage(prev, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
      setState(() => _currentIndex = prev);
    } catch (_) {}
  }

  Future<void> _handleBannerClick(SponsoredContent banner) async {
    try {
      Provider.of<SponsoredContentProvider>(context, listen: false).incrementClick(banner.id);
      if (banner.linkType == 'external') {
        final uri = Uri.parse(banner.linkUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      } else {
        if (mounted) context.go(banner.linkUrl);
      }
    } catch (_) {}
  }

  void _handlePromoteClick() {
    if (!mounted) return;
    context.go('/registro');
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<SponsoredContentProvider>(
      create: (_) => SponsoredContentProvider(placement: 'hero', limit: 5),
      child: Consumer<SponsoredContentProvider>(
        builder: (context, provider, _) {
          return _buildContent(context, provider);
        },
      ),
    );
  }

  Widget _buildContent(BuildContext context, SponsoredContentProvider provider) {
    const double bannerHeight = 280.0;
    const double padding = 16.0;

    if (provider.isLoading || provider.content.isEmpty) {
      return Container(
        height: bannerHeight,
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF2563EB), Color(0xFF9333EA), Color(0xFFDB2777)],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(color: Colors.black26, blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(padding),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'OPORTUNIDAD DE PUBLICIDAD',
                    style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Destaca Tu Negocio',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    shadows: [Shadow(color: Colors.black38, blurRadius: 4, offset: Offset(0, 2))],
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Llega a Miles de Clientes',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    shadows: [Shadow(color: Colors.black38, blurRadius: 4, offset: Offset(0, 2))],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Publica tu anuncio en la posición más visible.',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.95),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _handlePromoteClick,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, color: Color(0xFF1E40AF), size: 18),
                        SizedBox(width: 8),
                        Text('Crear Anuncio Ahora', style: TextStyle(color: Color(0xFF1E40AF), fontSize: 14, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final content = provider.content;
    return Container(
      height: bannerHeight,
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: MouseRegion(
        onEnter: (_) => setState(() {
          _isPaused = true;
          _rotationTimer?.cancel();
        }),
        onExit: (_) => setState(() {
          _isPaused = false;
          _startAutoRotation();
        }),
        child: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              itemCount: content.length,
              onPageChanged: (index) {
                setState(() => _currentIndex = index);
                if (index < content.length) _trackImpression(content[index].id);
              },
              itemBuilder: (context, index) {
                final banner = content[index];
                return GestureDetector(
                  onTap: () => _handleBannerClick(banner),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      if (banner.imageUrl.isNotEmpty)
                        Image.network(
                          banner.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _gradientFallback(),
                        )
                      else
                        _gradientFallback(),
                      // Overlay oscuro
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [
                              Colors.black.withOpacity(0.75),
                              Colors.black.withOpacity(0.4),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                      // Texto (con clip para evitar overflow)
                      Positioned(
                        left: padding,
                        right: padding,
                        top: padding,
                        bottom: padding,
                        child: ClipRect(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Text(
                                  'ANUNCIO PATROCINADO',
                                  style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                banner.title,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  shadows: [Shadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 2))],
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                banner.description,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.95),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text('Descubrir Más', style: TextStyle(color: Color(0xFF1E40AF), fontSize: 13, fontWeight: FontWeight.bold)),
                                    SizedBox(width: 6),
                                    Icon(Icons.arrow_forward, color: Color(0xFF1E40AF), size: 16),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            if (content.length > 1) ...[
              Positioned(left: 8, top: 0, bottom: 0, child: Center(
                child: GestureDetector(
                  onTap: _prevSlide,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white70, shape: BoxShape.circle),
                    child: const Icon(Icons.chevron_left, size: 24),
                  ),
                ),
              )),
              Positioned(right: 8, top: 0, bottom: 0, child: Center(
                child: GestureDetector(
                  onTap: _nextSlide,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white70, shape: BoxShape.circle),
                    child: const Icon(Icons.chevron_right, size: 24),
                  ),
                ),
              )),
              Positioned(
                bottom: 12,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    content.length,
                    (i) => GestureDetector(
                      onTap: () => _goToSlide(i),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: i == _currentIndex ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: i == _currentIndex ? Colors.white : Colors.white54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _gradientFallback() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2563EB), Color(0xFF9333EA), Color(0xFFDB2777)],
        ),
      ),
      child: const Center(child: Text('📢', style: TextStyle(fontSize: 48))),
    );
  }
}


