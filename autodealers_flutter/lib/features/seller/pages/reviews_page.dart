// Página de Reseñas del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/reviews_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerReviewsPage extends StatelessWidget {
  const SellerReviewsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Reseñas'),
      ),
      body: Consumer<ReviewsProvider>(
        builder: (context, reviewsProvider, _) {
          if (reviewsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (reviewsProvider.reviews.isEmpty) {
            return const Center(child: Text('No hay reseñas'));
          }

          return ListView.builder(
            itemCount: reviewsProvider.reviews.length,
            itemBuilder: (context, index) {
              final review = reviewsProvider.reviews[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  title: Text(review['customerName'] ?? 'Cliente'),
                  subtitle: Text(review['comment'] ?? ''),
                  trailing: Text('${review['rating'] ?? 0} ⭐'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


