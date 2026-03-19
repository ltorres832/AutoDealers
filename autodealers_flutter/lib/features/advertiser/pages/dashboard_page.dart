// Dashboard del Advertiser
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/billing_provider.dart';

class AdvertiserDashboardPage extends StatelessWidget {
  const AdvertiserDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
      ),
      body: Consumer2<AuthProvider, BillingProvider>(
        builder: (context, authProvider, billingProvider, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Bienvenido',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text('Usuario: ${authProvider.user?.email ?? 'N/A'}'),
                        if (authProvider.user?.name != null)
                          Text('${authProvider.user!.name}', style: TextStyle(color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Resumen de Anuncios',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  children: [
                    InkWell(
                      onTap: () => context.go('/advertiser/ads'),
                      borderRadius: BorderRadius.circular(12),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.campaign, size: 48, color: Theme.of(context).colorScheme.primary),
                              const SizedBox(height: 8),
                              const Text('Anuncios', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                              const Text('Gestionar campañas', style: TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => context.go('/advertiser/billing'),
                      borderRadius: BorderRadius.circular(12),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.payment, size: 48, color: Theme.of(context).colorScheme.primary),
                              const SizedBox(height: 8),
                              const Text('Facturación', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                              const Text('Métodos de pago', style: TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

