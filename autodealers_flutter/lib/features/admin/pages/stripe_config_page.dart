// Página de Configuración Stripe (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/stripe_config_provider.dart';

class AdminStripeConfigPage extends StatefulWidget {
  const AdminStripeConfigPage({super.key});

  @override
  State<AdminStripeConfigPage> createState() => _AdminStripeConfigPageState();
}

class _AdminStripeConfigPageState extends State<AdminStripeConfigPage> {
  final _secretKeyController = TextEditingController();
  final _publishableKeyController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StripeConfigProvider>().loadStripeConfig();
    });
  }

  @override
  void dispose() {
    _secretKeyController.dispose();
    _publishableKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración Stripe'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _saveConfig,
          ),
        ],
      ),
      body: Consumer<StripeConfigProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final config = provider.config;
          if (config != null) {
            _secretKeyController.text = config['secretKey'] ?? '';
            _publishableKeyController.text = config['publishableKey'] ?? '';
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _secretKeyController,
                  decoration: const InputDecoration(
                    labelText: 'Secret Key',
                    border: OutlineInputBorder(),
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _publishableKeyController,
                  decoration: const InputDecoration(
                    labelText: 'Publishable Key',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => provider.verifyConnection(),
                  child: const Text('Verificar Conexión'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _saveConfig() {
    final provider = context.read<StripeConfigProvider>();
    provider.updateStripeConfig({
      'secretKey': _secretKeyController.text,
      'publishableKey': _publishableKeyController.text,
    });
  }
}


