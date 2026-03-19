// Página de Promociones del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/promotions_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerPromotionsPage extends StatelessWidget {
  const DealerPromotionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Promociones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/promotions/create'),
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
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  title: Text(promotion['title'] ?? 'Sin título'),
                  subtitle: Text(promotion['description'] ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: () => context.push('/dealer/promotions/${promotion['id']}'),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


