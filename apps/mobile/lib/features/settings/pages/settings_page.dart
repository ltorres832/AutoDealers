import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuración')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.extension),
            title: const Text('Integraciones'),
            onTap: () => context.push('/settings/integrations'),
          ),
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Plantillas'),
            onTap: () => context.push('/settings/templates'),
          ),
        ],
      ),
    );
  }
}
