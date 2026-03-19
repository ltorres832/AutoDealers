// Página de Detalle de Vendedor del Dealer
import 'package:flutter/material.dart';
import '../widgets/dealer_drawer.dart';

class DealerSellerDetailPage extends StatelessWidget {
  final String sellerId;

  const DealerSellerDetailPage({super.key, required this.sellerId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Detalle de Vendedor'),
      ),
      body: Center(
        child: Text('Detalle de Vendedor: $sellerId'),
      ),
    );
  }
}


