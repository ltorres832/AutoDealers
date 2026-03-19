// Página de Detalle de Solicitud FI del Seller
import 'package:flutter/material.dart';
import '../widgets/seller_drawer.dart';

class SellerFIRequestPage extends StatelessWidget {
  final String requestId;
  
  const SellerFIRequestPage({
    super.key,
    required this.requestId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Detalle de Solicitud'),
      ),
      body: Center(
        child: Text('Solicitud FI: $requestId'),
      ),
    );
  }
}


