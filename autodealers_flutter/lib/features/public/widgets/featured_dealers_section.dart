// Dealers Destacados - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/public_dealers_provider.dart';

class FeaturedDealersSection extends StatelessWidget {
  const FeaturedDealersSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PublicDealersProvider>(
      builder: (context, provider, _) {
        final dealers = provider.dealers;

        if (provider.isLoading) {
          return Container(
            padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
            color: Colors.white,
            child: const Center(child: CircularProgressIndicator()),
          );
        }

        if (dealers.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
        color: Colors.white,
        child: const Column(
          children: [
            Text(
              'Concesionarios',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
            SizedBox(height: 16),
            Text(
              'No hay concesionarios disponibles en este momento',
              style: TextStyle(
                fontSize: 20,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      );
        }

        return Container(
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      color: Colors.white,
      child: Column(
        children: [
          const Text(
            'Dealers y Vendedores Destacados',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827), // gray-900
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Conoce a nuestros mejores vendedores y dealers',
            style: TextStyle(
              fontSize: 20,
              color: Color(0xFF4B5563), // gray-600
            ),
          ),
          const SizedBox(height: 48),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 1024 
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
                  childAspectRatio: 0.9,
                ),
                itemCount: dealers.length > 6 ? 6 : dealers.length,
                itemBuilder: (context, index) => _DealerCard(dealer: dealers[index]),
              );
            },
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: () => context.go('/dealers'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB), // blue-600
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              elevation: 4,
            ),
            child: const Text('Ver Todos los Dealers y Vendedores →'),
          ),
        ],
      ),
    );
      },
    );
  }
}

class _DealerCard extends StatefulWidget {
  final PublicDealer dealer;

  const _DealerCard({required this.dealer});

  @override
  State<_DealerCard> createState() => _DealerCardState();
}

class _DealerCardState extends State<_DealerCard> {
  bool _isHovered = false;

  Widget _buildDealerAvatar() {
    final photo = widget.dealer.photo;
    final initial = widget.dealer.name.isNotEmpty
        ? widget.dealer.name.substring(0, 1).toUpperCase()
        : '?';
    if (photo != null && photo.trim().isNotEmpty) {
      return ClipOval(
        child: Image.network(
          photo,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholderAvatar(initial),
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return SizedBox(
              width: 64,
              height: 64,
              child: Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                          loadingProgress.expectedTotalBytes!
                      : null,
                ),
              ),
            );
          },
        ),
      );
    }
    return _placeholderAvatar(initial);
  }

  Widget _placeholderAvatar(String initial) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade500, Colors.blue.shade600],
        ),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: () {
          context.go('/catalog?tenantId=${widget.dealer.id}');
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _isHovered ? const Color(0xFF3B82F6) : Colors.transparent, // blue-500
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Foto y Nombre
              Row(
                children: [
                  _buildDealerAvatar(),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.dealer.name,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _isHovered ? Colors.blue : Colors.grey.shade900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: Colors.grey),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                widget.dealer.location ?? '—',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Rating
              if (widget.dealer.rating != null && widget.dealer.ratingCount != null)
                Row(
                  children: [
                    ...List.generate(
                      5,
                      (index) => Icon(
                        index < widget.dealer.rating!.round()
                            ? Icons.star
                            : Icons.star_border,
                        size: 20,
                        color: Colors.amber,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '(${widget.dealer.ratingCount} ${widget.dealer.ratingCount == 1 ? 'reseña' : 'reseñas'})',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 16),
              
              // Vehicle Count (siempre visible)
              Row(
                children: [
                  const Text('🚗', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  Text(
                    '${widget.dealer.vehicleCount ?? 0} vehículos disponibles',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              
              // Botón
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    context.go('/catalog?dealerId=${Uri.encodeComponent(widget.dealer.id)}');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB), // blue-600
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Ver Perfil Completo'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


