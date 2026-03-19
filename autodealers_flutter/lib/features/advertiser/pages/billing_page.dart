// Página de Facturación del Advertiser - métodos de pago (Stripe)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/presentation/providers/advertiser_provider.dart';

class AdvertiserBillingPage extends StatefulWidget {
  const AdvertiserBillingPage({super.key});

  @override
  State<AdvertiserBillingPage> createState() => _AdvertiserBillingPageState();
}

class _AdvertiserBillingPageState extends State<AdvertiserBillingPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdvertiserProvider>().loadPaymentMethods();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Facturación'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<AdvertiserProvider>().loadPaymentMethods(),
          ),
        ],
      ),
      body: Consumer<AdvertiserProvider>(
        builder: (context, provider, _) {
          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${provider.error}', textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadPaymentMethods(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Métodos de pago',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Añade una tarjeta o cuenta bancaria para pagar tus anuncios.',
                  style: TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: provider.isLoading
                            ? null
                            : () => _addPaymentMethod(context, provider, 'card'),
                        icon: const Icon(Icons.credit_card),
                        label: const Text('Añadir tarjeta'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: provider.isLoading
                            ? null
                            : () => _addPaymentMethod(context, provider, 'us_bank_account'),
                        icon: const Icon(Icons.account_balance),
                        label: const Text('Cuenta bancaria'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (provider.isLoading && provider.paymentMethods.isEmpty)
                  const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
                else if (provider.paymentMethods.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text('No hay métodos de pago. Añade uno arriba.'),
                      ),
                    ),
                  )
                else
                  ...provider.paymentMethods.map((pm) {
                    final id = pm['id'] as String? ?? '';
                    final type = pm['type'] as String? ?? 'card';
                    final last4 = pm['last4'] as String? ?? '****';
                    final isDefault = pm['isDefault'] == true;
                    final brand = pm['brand'] as String?;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: Icon(
                          type == 'us_bank_account' ? Icons.account_balance : Icons.credit_card,
                          color: Theme.of(context).primaryColor,
                        ),
                        title: Text(
                          type == 'us_bank_account'
                              ? 'Cuenta •••• $last4'
                              : '${brand ?? 'Tarjeta'} •••• $last4',
                        ),
                        subtitle: isDefault ? const Text('Predeterminado') : null,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (!isDefault)
                              TextButton(
                                onPressed: () async {
                                  final ok = await provider.setDefaultPaymentMethod(id);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ok ? 'Predeterminado actualizado' : 'Error')),
                                    );
                                  }
                                },
                                child: const Text('Predeterminado'),
                              ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('Eliminar método de pago'),
                                    content: const Text('¿Quieres eliminar este método de pago?'),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(ctx, false),
                                        child: const Text('Cancelar'),
                                      ),
                                      TextButton(
                                        onPressed: () => Navigator.pop(ctx, true),
                                        child: const Text('Eliminar'),
                                      ),
                                    ],
                                  ),
                                );
                                if (confirm == true) {
                                  final ok = await provider.detachPaymentMethod(id);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(ok ? 'Método eliminado' : 'Error')),
                                    );
                                  }
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _addPaymentMethod(BuildContext context, AdvertiserProvider provider, String methodType) async {
    final url = await provider.createSetupSession(methodType);
    if (url == null || url.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo iniciar: ${provider.error}')),
        );
      }
      return;
    }
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Completa el flujo en el navegador. Al volver, actualiza la lista.')),
        );
      }
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se puede abrir: $url')),
        );
      }
    }
  }
}

