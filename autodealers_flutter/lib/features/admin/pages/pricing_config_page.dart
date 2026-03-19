// Página de Configuración de Precios (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/pricing_config_provider.dart';

class AdminPricingConfigPage extends StatefulWidget {
  const AdminPricingConfigPage({super.key});

  @override
  State<AdminPricingConfigPage> createState() => _AdminPricingConfigPageState();
}

class _AdminPricingConfigPageState extends State<AdminPricingConfigPage> {
  final _promotionPriceController = TextEditingController();
  final _bannerPriceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PricingConfigProvider>().loadPricingConfig();
    });
  }

  @override
  void dispose() {
    _promotionPriceController.dispose();
    _bannerPriceController.dispose();
    super.dispose();
  }

  Future<void> _saveConfig() async {
    final provider = context.read<PricingConfigProvider>();
    await provider.updatePricingConfig({
      'promotionPrice': double.tryParse(_promotionPriceController.text),
      'bannerPrice': double.tryParse(_bannerPriceController.text),
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Configuración guardada')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración de Precios'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _saveConfig,
          ),
        ],
      ),
      body: Consumer<PricingConfigProvider>(
        builder: (context, pricingConfigProvider, _) {
          if (pricingConfigProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final config = pricingConfigProvider.pricingConfig;
          if (config != null) {
            _promotionPriceController.text = '${config['promotionPrice'] ?? 0}';
            _bannerPriceController.text = '${config['bannerPrice'] ?? 0}';
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _promotionPriceController,
                  decoration: const InputDecoration(
                    labelText: 'Precio de Promoción',
                    border: OutlineInputBorder(),
                    prefixText: '\$ ',
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _bannerPriceController,
                  decoration: const InputDecoration(
                    labelText: 'Precio de Banner',
                    border: OutlineInputBorder(),
                    prefixText: '\$ ',
                  ),
                  keyboardType: TextInputType.number,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


