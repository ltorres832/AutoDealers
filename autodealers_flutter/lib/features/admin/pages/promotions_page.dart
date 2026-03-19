// Página de Gestión de Promociones (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/promotions_provider.dart';

class AdminPromotionsPage extends StatelessWidget {
  const AdminPromotionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Promociones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/promotions/create'),
          ),
        ],
      ),
      body: Consumer<PromotionsProvider>(
        builder: (context, promotionsProvider, _) {
          if (promotionsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (promotionsProvider.promotions.isEmpty) {
            return const Center(child: Text('No hay promociones'));
          }

          return ListView.builder(
            itemCount: promotionsProvider.promotions.length,
            itemBuilder: (context, index) {
              final promotion = promotionsProvider.promotions[index];
              return ListTile(
                title: Text(promotion['title'] ?? 'Sin título'),
                subtitle: Text(promotion['description'] ?? ''),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (promotion['status'] == 'active')
                      IconButton(
                        icon: const Icon(Icons.pause),
                        onPressed: () => promotionsProvider.pausePromotion(promotion['id'] as String),
                      )
                    else
                      IconButton(
                        icon: const Icon(Icons.play_arrow),
                        onPressed: () => promotionsProvider.activatePromotion(promotion['id'] as String),
                      ),
                    IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => context.push('/admin/promotions/${promotion['id']}/edit'),
                    ),
                  ],
                ),
                onTap: () => context.push('/admin/promotions/${promotion['id']}'),
              );
            },
          );
        },
      ),
    );
  }
}


