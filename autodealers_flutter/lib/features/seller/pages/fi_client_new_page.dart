// Página de Nuevo Cliente FI del Seller
import 'package:flutter/material.dart';
import '../widgets/seller_drawer.dart';

class SellerFIClientNewPage extends StatelessWidget {
  const SellerFIClientNewPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Nuevo Cliente FI'),
      ),
      body: const Center(
        child: Text('Formulario de nuevo cliente FI'),
      ),
    );
  }
}


