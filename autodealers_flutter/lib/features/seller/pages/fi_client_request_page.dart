// Página de Solicitud de Cliente FI del Seller
import 'package:flutter/material.dart';
import '../widgets/seller_drawer.dart';

class SellerFIClientRequestPage extends StatelessWidget {
  final String clientId;
  
  const SellerFIClientRequestPage({
    super.key,
    required this.clientId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Solicitud de Cliente'),
      ),
      body: Center(
        child: Text('Solicitud para cliente: $clientId'),
      ),
    );
  }
}


