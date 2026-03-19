// Página de Usuarios del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerUsersPage extends StatelessWidget {
  const SellerUsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Usuarios'),
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          // Nota: Los sellers normalmente no gestionan usuarios
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.people, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Gestión de Usuarios',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Los vendedores no tienen permisos para\ngestionar usuarios del sistema.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


