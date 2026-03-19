// Página de Configuración de Landing Pages (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/landing_config_provider.dart';

class AdminLandingConfigPage extends StatefulWidget {
  const AdminLandingConfigPage({super.key});

  @override
  State<AdminLandingConfigPage> createState() => _AdminLandingConfigPageState();
}

class _AdminLandingConfigPageState extends State<AdminLandingConfigPage> {
  final _heroTitleController = TextEditingController();
  final _heroSubtitleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LandingConfigProvider>().loadLandingConfig();
    });
  }

  @override
  void dispose() {
    _heroTitleController.dispose();
    _heroSubtitleController.dispose();
    super.dispose();
  }

  Future<void> _saveConfig() async {
    final provider = context.read<LandingConfigProvider>();
    await provider.updateLandingConfig({
      'hero': {
        'title': _heroTitleController.text,
        'subtitle': _heroSubtitleController.text,
      },
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
        title: const Text('Configuración de Landing Pages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _saveConfig,
          ),
        ],
      ),
      body: Consumer<LandingConfigProvider>(
        builder: (context, landingConfigProvider, _) {
          if (landingConfigProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final config = landingConfigProvider.landingConfig;
          if (config != null && config['hero'] != null) {
            final hero = config['hero'] as Map<String, dynamic>;
            _heroTitleController.text = hero['title'] ?? '';
            _heroSubtitleController.text = hero['subtitle'] ?? '';
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Sección Hero',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _heroTitleController,
                  decoration: const InputDecoration(
                    labelText: 'Título',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _heroSubtitleController,
                  decoration: const InputDecoration(
                    labelText: 'Subtítulo',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


