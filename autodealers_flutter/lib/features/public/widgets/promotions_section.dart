// Sección de Promociones - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/public_promotions_provider.dart';

class PromotionsSection extends StatefulWidget {
  const PromotionsSection({super.key});

  @override
  State<PromotionsSection> createState() => _PromotionsSectionState();
}

class _PromotionsSectionState extends State<PromotionsSection> {

  @override
  Widget build(BuildContext context) {
    return Consumer<PublicPromotionsProvider>(
      builder: (context, provider, _) {
        final promotions = provider.promotions;
        
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 96, horizontal: 24),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC), // slate-50 equivalente
            border: const Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)), // slate-200
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.amber.shade500,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Text(
                  'PROMOCIONES ESPECIALES',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Ofertas Exclusivas',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A), // slate-900
                ),
              ),
              const SizedBox(height: 16),
                  const SizedBox(
                    width: 768,
                    child: Text(
                      'Promociones verificadas de nuestros concesionarios certificados',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        color: Color(0xFF475569), // slate-600
                      ),
                    ),
                  ),
              const SizedBox(height: 64),
              
              if (provider.isLoading)
                const Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(),
                )
              else if (promotions.isEmpty)
            Container(
              padding: const EdgeInsets.all(48),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue.shade50, Colors.purple.shade50, Colors.pink.shade50],
                ),
                border: Border.all(color: Colors.blue.shade300, width: 2, style: BorderStyle.solid),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.blue.shade500, Colors.purple.shade600],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.campaign,
                      color: Colors.white,
                      size: 40,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Promociona Tu Negocio Aquí',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const SizedBox(
                    width: 400,
                    child: Text(
                      'Llega a miles de compradores de vehículos. Crea tu anuncio y aumenta tu visibilidad.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => context.go('/registro'),
                    icon: const Icon(Icons.add),
                    label: const Text('Crear Anuncio Ahora'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                  ),
                ],
              ),
            )
            else
            LayoutBuilder(
              builder: (context, constraints) {
                final crossAxisCount = constraints.maxWidth > 1400 
                    ? 4 
                    : constraints.maxWidth > 1024 
                        ? 3 
                        : constraints.maxWidth > 768 
                            ? 2 
                            : 1;
                
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 24,
                    mainAxisSpacing: 24,
                    childAspectRatio: 0.75,
                  ),
                  itemCount: promotions.length > 12 ? 12 : promotions.length,
                  itemBuilder: (context, index) => _PromotionCard(
                    promotion: promotions[index],
                    index: index,
                    provider: provider,
                  ),
                );
              },
            ),
          ],
        ),
      );
    },
  );
  }
}

class _PromotionCard extends StatefulWidget {
  final Promotion promotion;
  final int index;
  final PublicPromotionsProvider provider;

  const _PromotionCard({
    required this.promotion,
    required this.index,
    required this.provider,
  });

  @override
  State<_PromotionCard> createState() => _PromotionCardState();
}

class _PromotionCardState extends State<_PromotionCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: () {
          widget.provider.incrementClick(widget.promotion.id);
          if (widget.promotion.vehicleId != null && widget.promotion.vehicleId!.isNotEmpty) {
            context.go('/catalog/${widget.promotion.vehicleId}');
          } else {
            context.go('/catalog?dealerId=${Uri.encodeComponent(widget.promotion.tenantId)}');
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isHovered ? Colors.amber.shade400 : Colors.transparent,
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(_isHovered ? 0.2 : 0.1),
                blurRadius: _isHovered ? 24 : 8,
                offset: Offset(0, _isHovered ? 8 : 4),
              ),
            ],
          ),
          transform: Matrix4.identity()..translate(0.0, _isHovered ? -8.0 : 0.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Imagen
              Expanded(
                flex: 3,
                child: Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.yellow.shade100,
                            Colors.orange.shade100,
                            Colors.pink.shade100,
                          ],
                        ),
                      ),
                      child: widget.promotion.imageUrl != null
                          ? Image.network(
                              widget.promotion.imageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => const Center(
                                child: Icon(Icons.campaign, size: 64, color: Colors.grey),
                              ),
                            )
                          : const Center(
                              child: Icon(Icons.campaign, size: 64, color: Colors.grey),
                            ),
                    ),
                    // Overlay gradient
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.transparent,
                              Colors.black.withOpacity(0.6),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Badge Premium
                    Positioned(
                      top: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade500,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'PREMIUM',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ),
                    // Descuento
                    if (widget.promotion.discount != null)
                      Positioned(
                        bottom: 16,
                        left: 16,
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.95),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            widget.promotion.discount!.type == 'percentage'
                                ? '${widget.promotion.discount!.value.toStringAsFixed(0)}% OFF'
                                : '\$${widget.promotion.discount!.value.toStringAsFixed(0)} OFF',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade600,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              
              // Información
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.promotion.name,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: _isHovered ? Colors.blue : Colors.grey.shade900,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.promotion.description,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (widget.promotion.tenantName != null) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [Colors.blue.shade500, Colors.purple.shade500],
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  widget.promotion.tenantName!.substring(0, 1).toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'De: ${widget.promotion.tenantName}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                      if ((widget.promotion.sellerRating != null && widget.promotion.sellerRating! > 0) ||
                          (widget.promotion.dealerRating != null && widget.promotion.dealerRating! > 0)) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            ...List.generate(
                              5,
                              (index) => Icon(
                                index < (widget.promotion.sellerRating ?? widget.promotion.dealerRating ?? 0).round()
                                    ? Icons.star
                                    : Icons.star_border,
                                size: 16,
                                color: Colors.amber,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '(${widget.promotion.sellerRatingCount ?? widget.promotion.dealerRatingCount ?? 0})',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ],
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
}


