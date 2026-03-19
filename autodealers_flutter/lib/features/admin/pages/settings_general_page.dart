// Página de Configuración General (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/settings_provider.dart';

class AdminSettingsGeneralPage extends StatefulWidget {
  const AdminSettingsGeneralPage({super.key});

  @override
  State<AdminSettingsGeneralPage> createState() => _AdminSettingsGeneralPageState();
}

class _AdminSettingsGeneralPageState extends State<AdminSettingsGeneralPage> {
  final _formKey = GlobalKey<FormState>();
  final _appNameController = TextEditingController();
  final _supportEmailController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SettingsProvider>().loadSettings();
    });
  }

  @override
  void dispose() {
    _appNameController.dispose();
    _supportEmailController.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<SettingsProvider>();
    await provider.updateSettings({
      'appName': _appNameController.text,
      'supportEmail': _supportEmailController.text,
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
        title: const Text('Configuración General'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _saveSettings,
          ),
        ],
      ),
      body: Consumer<SettingsProvider>(
        builder: (context, settingsProvider, _) {
          if (settingsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final settings = settingsProvider.settings;
          if (settings != null) {
            _appNameController.text = settings['appName'] ?? '';
            _supportEmailController.text = settings['supportEmail'] ?? '';
          }

          return Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _appNameController,
                    decoration: const InputDecoration(
                      labelText: 'Nombre de la Aplicación',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _supportEmailController,
                    decoration: const InputDecoration(
                      labelText: 'Email de Soporte',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Requerido';
                      if (!value.contains('@')) return 'Email inválido';
                      return null;
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}


