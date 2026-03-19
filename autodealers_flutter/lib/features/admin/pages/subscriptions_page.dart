// Página de Suscripciones (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/billing_provider.dart';

class AdminSubscriptionsPage extends StatefulWidget {
  const AdminSubscriptionsPage({super.key});

  @override
  State<AdminSubscriptionsPage> createState() => _AdminSubscriptionsPageState();
}

class _AdminSubscriptionsPageState extends State<AdminSubscriptionsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Cargar todas las suscripciones (requiere Cloud Function de admin)
      context.read<BillingProvider>().loadMemberships();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Suscripciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<BillingProvider>().loadMemberships();
            },
          ),
        ],
      ),
      body: Consumer<BillingProvider>(
        builder: (context, billingProvider, _) {
          if (billingProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (billingProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: ${billingProvider.error}'),
                ],
              ),
            );
          }

          // Nota: Esta página requiere una Cloud Function de admin para obtener todas las suscripciones
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.subscriptions, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Gestión de Suscripciones',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Esta funcionalidad requiere una Cloud Function\nde administración para listar todas las suscripciones.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Funcionalidad en desarrollo - Cloud Function requerida'),
                      ),
                    );
                  },
                  child: const Text('Cargar Suscripciones'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


