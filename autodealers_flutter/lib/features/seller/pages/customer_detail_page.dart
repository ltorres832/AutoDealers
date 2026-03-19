// Página de Detalle de Cliente del Seller
import 'package:flutter/material.dart';
import '../widgets/seller_drawer.dart';

class SellerCustomerDetailPage extends StatelessWidget {
  final String customerId;
  
  const SellerCustomerDetailPage({
    super.key,
    required this.customerId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Detalle de Cliente'),
      ),
      body: Center(
        child: Text('Cliente: $customerId'),
      ),
    );
  }
}


