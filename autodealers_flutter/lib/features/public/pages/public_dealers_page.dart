// Página Concesionarios - Listado completo (replica Next.js /dealers)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/public_dealers_provider.dart';
import '../widgets/public_navbar.dart';

class PublicDealersPage extends StatefulWidget {
  const PublicDealersPage({super.key});

  @override
  State<PublicDealersPage> createState() => _PublicDealersPageState();
}

class _PublicDealersPageState extends State<PublicDealersPage> {
  static const int _loadLimit = 100;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PublicDealersProvider>().loadDealers(limit: _loadLimit);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: PublicNavbar()),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    onTap: () => context.go('/'),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: Row(
                        children: [
                          Icon(Icons.arrow_back, size: 20, color: theme.textTheme.bodyMedium?.color),
                          const SizedBox(width: 8),
                          Text(
                            'Volver al inicio',
                            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Text(
                    'Concesionarios',
                    style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Conoce a nuestros dealers y vendedores',
                    style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 32),
                  Consumer<PublicDealersProvider>(
                    builder: (context, provider, _) {
                      if (provider.isLoading) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 48),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      if (provider.error != null) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 48),
                          child: Center(
                            child: Text(
                              provider.error!,
                              style: TextStyle(color: theme.colorScheme.error),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        );
                      }
                      final dealers = provider.dealers;
                      if (dealers.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 48),
                          child: Center(
                            child: Text(
                              'No hay concesionarios disponibles en este momento.',
                              style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                            ),
                          ),
                        );
                      }
                      return LayoutBuilder(
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
                            itemCount: dealers.length,
                            itemBuilder: (context, index) => _DealerCard(dealer: dealers[index]),
                          );
                        },
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DealerCard extends StatelessWidget {
  final PublicDealer dealer;

  const _DealerCard({required this.dealer});

  Widget _buildAvatar() {
    final photo = dealer.photo;
    final initial = dealer.name.isNotEmpty ? dealer.name.substring(0, 1).toUpperCase() : '?';
    if (photo != null && photo.trim().isNotEmpty) {
      return ClipOval(
        child: Image.network(
          photo,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholder(initial),
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
    return _placeholder(initial);
  }

  Widget _placeholder(String initial) {
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
          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildAvatar(),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      dealer.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            dealer.location ?? '—',
                            style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
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
          if (dealer.rating != null && dealer.ratingCount != null)
            Row(
              children: [
                ...List.generate(
                  5,
                  (i) => Icon(
                    i < dealer.rating!.round() ? Icons.star : Icons.star_border,
                    size: 20,
                    color: Colors.amber,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '(${dealer.ratingCount} ${dealer.ratingCount == 1 ? 'reseña' : 'reseñas'})',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
              ],
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('🚗', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Text(
                '${dealer.vehicleCount ?? 0} vehículos disponibles',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
              ),
            ],
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.go('/catalog?dealerId=${Uri.encodeComponent(dealer.id)}'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('Ver Perfil Completo'),
            ),
          ),
        ],
      ),
    );
  }
}


