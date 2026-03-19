// Página de Gestión de Reseñas (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/reviews_provider.dart';

class AdminReviewsPage extends StatelessWidget {
  const AdminReviewsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                  leading: CircleAvatar(
                    child: Text('${review['rating'] ?? 0}'),
                  ),
                  title: Text(review['customerName'] ?? 'Sin nombre'),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(review['comment'] ?? ''),
                      if (review['approved'] != true)
                        const Text('Pendiente de aprobación', style: TextStyle(color: Colors.orange)),
                    ],
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (review['approved'] != true)
                        IconButton(
                          icon: const Icon(Icons.check),
                          onPressed: () => reviewsProvider.approveReview(review['id'] as String),
                        ),
                      IconButton(
                        icon: const Icon(Icons.reply),
                        onPressed: () => _showReplyDialog(context, review),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showReplyDialog(BuildContext context, Map<String, dynamic> review) {
    final replyController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Responder Reseña'),
        content: TextField(
          controller: replyController,
          decoration: const InputDecoration(
            labelText: 'Respuesta',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              context.read<ReviewsProvider>().respondToReview(
                    reviewId: review['id'] as String,
                    response: replyController.text,
                  );
              Navigator.pop(context);
            },
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
  }
}


