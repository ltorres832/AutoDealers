// Página de Configuración de IA (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/ai_config_provider.dart';

class AdminAIConfigPage extends StatefulWidget {
  const AdminAIConfigPage({super.key});

  @override
  State<AdminAIConfigPage> createState() => _AdminAIConfigPageState();
}

class _AdminAIConfigPageState extends State<AdminAIConfigPage> {
  String _selectedProvider = 'openai';
  final _apiKeyController = TextEditingController();
  final _modelController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AIConfigProvider>().loadAIConfig();
    });
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  Future<void> _saveConfig() async {
    final provider = context.read<AIConfigProvider>();
    await provider.updateAIConfig({
      'provider': _selectedProvider,
      'apiKey': _apiKeyController.text,
      'model': _modelController.text,
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
        title: const Text('Configuración de IA'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _saveConfig,
          ),
        ],
      ),
      body: Consumer<AIConfigProvider>(
        builder: (context, aiConfigProvider, _) {
          if (aiConfigProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final config = aiConfigProvider.aiConfig;
          if (config != null) {
            _selectedProvider = config['provider'] ?? 'openai';
            _apiKeyController.text = config['apiKey'] ?? '';
            _modelController.text = config['model'] ?? '';
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  value: _selectedProvider,
                  decoration: const InputDecoration(
                    labelText: 'Proveedor',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'openai', child: Text('OpenAI')),
                    DropdownMenuItem(value: 'anthropic', child: Text('Anthropic')),
                  ],
                  onChanged: (value) => setState(() => _selectedProvider = value ?? 'openai'),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _apiKeyController,
                  decoration: const InputDecoration(
                    labelText: 'API Key',
                    border: OutlineInputBorder(),
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _modelController,
                  decoration: const InputDecoration(
                    labelText: 'Modelo',
                    border: OutlineInputBorder(),
                    hintText: 'gpt-4, claude-3-opus, etc.',
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


