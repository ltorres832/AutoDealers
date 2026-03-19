// Página de Clientes del Seller
import 'package:flutter/material.dart';
import '../widgets/seller_drawer.dart';

class SellerCustomersPage extends StatelessWidget {
  const SellerCustomersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Clientes'),
      ),
      body: const Center(
        child: Text('Lista de clientes'),
      ),
    );
  }
}


