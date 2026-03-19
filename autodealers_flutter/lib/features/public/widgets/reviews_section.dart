// Sección de Reseñas - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/public_reviews_provider.dart';

class ReviewsSection extends StatelessWidget {
  const ReviewsSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PublicReviewsProvider>(
      builder: (context, provider, _) {
        final reviews = provider.reviews;

        return Container(
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFF9FAFB), // gray-50
            Colors.white,
            const Color(0xFFFAF5FF), // purple-50
          ],
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF3E8FF), // purple-100
              borderRadius: BorderRadius.circular(30),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('⭐'),
                SizedBox(width: 4),
                Text(
                  'RESEÑAS',
                  style: TextStyle(
                    color: Color(0xFF9333EA), // purple-600
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Lo Que Dicen Nuestros Clientes',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827), // gray-900
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Experiencias reales de compradores satisfechos',
            style: TextStyle(
              fontSize: 20,
              color: Color(0xFF4B5563), // gray-600
            ),
          ),
          const SizedBox(height: 48),
          
          if (provider.isLoading)
            const Padding(
              padding: EdgeInsets.all(48.0),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (reviews.isEmpty)
            Container(
              padding: const EdgeInsets.all(48),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Colors.grey.shade300, width: 2, style: BorderStyle.solid),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.star_outline,
                    size: 64,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aún no hay reseñas disponibles',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Las reseñas de nuestros clientes aparecerán aquí cuando estén disponibles',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            )
          else
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
                    childAspectRatio: 0.85,
                  ),
                  itemCount: reviews.length > 6 ? 6 : reviews.length,
                  itemBuilder: (context, index) => _ReviewCard(review: reviews[index]),
                );
              },
            ),
          const SizedBox(height: 48),
          
          // Botones de acción
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              ElevatedButton(
                onPressed: () {
                  // Por ahora navegar a la página principal, luego se puede crear una página de reviews
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Página de reseñas próximamente'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9333EA), // purple-600
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  elevation: 4,
                ),
                child: const Text('Ver Todas las Reseñas →'),
              ),
              OutlinedButton(
                onPressed: () {
                  // Por ahora mostrar mensaje, luego se puede crear una página de submit review
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Formulario de reseña próximamente'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  side: const BorderSide(color: Color(0xFF9333EA), width: 2), // purple-600
                ),
                child: const Text(
                  'Dejar una Reseña',
                  style: TextStyle(color: Color(0xFF9333EA)), // purple-600
                ),
              ),
            ],
          ),
        ],
      ),
    );
      },
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final PublicReview review;

  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade500, Colors.purple.shade500],
                  ),
                  shape: BoxShape.circle,
                ),
                child: review.customerPhoto != null
                    ? ClipOval(
                        child: Image.network(
                          review.customerPhoto!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Center(
                            child: Text(
                              review.customerName.substring(0, 1).toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      )
                    : Center(
                        child: Text(
                          review.customerName.substring(0, 1).toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            review.customerName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF111827), // gray-900
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (review.verified)
                          const Icon(
                            Icons.verified,
                            size: 16,
                            color: Colors.blue,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        ...List.generate(
                          5,
                          (index) => Icon(
                            index < review.rating.round()
                                ? Icons.star
                                : Icons.star_border,
                            size: 16,
                            color: Colors.amber,
                          ),
                        ),
                      ],
                    ),
                    if (review.vehicleName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        review.vehicleName!,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Comentario
          Expanded(
            child: Text(
              '"${review.comment}"',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
                height: 1.6,
              ),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 16),
          
          // Footer
          Container(
            padding: const EdgeInsets.only(top: 16),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey.shade100)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    review.dealerName != null
                        ? 'Dealer: ${review.dealerName}'
                        : review.sellerName != null
                            ? 'Vendedor: ${review.sellerName}'
                            : '',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${review.createdAt.day}/${review.createdAt.month}/${review.createdAt.year}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


