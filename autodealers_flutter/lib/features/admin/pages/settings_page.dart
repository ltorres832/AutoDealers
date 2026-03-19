// Página Principal de Configuración (Admin)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminSettingsPage extends StatelessWidget {
  const AdminSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración'),
      ),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Configuración General'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/general'),
          ),
          ListTile(
            leading: const Icon(Icons.extension),
            title: const Text('Integraciones'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/integrations'),
          ),
          ListTile(
            leading: const Icon(Icons.payment),
            title: const Text('Stripe'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/stripe'),
          ),
          ListTile(
            leading: const Icon(Icons.smart_toy),
            title: const Text('Configuración IA'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/ai-config'),
          ),
          ListTile(
            leading: const Icon(Icons.flag),
            title: const Text('Feature Flags'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/feature-flags'),
          ),
          ListTile(
            leading: const Icon(Icons.attach_money),
            title: const Text('Configuración de Precios'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/pricing-config'),
          ),
          ListTile(
            leading: const Icon(Icons.landscape),
            title: const Text('Configuración de Landing Pages'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/landing-config'),
          ),
          ListTile(
            leading: const Icon(Icons.build),
            title: const Text('Modo Mantenimiento'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/admin/settings/maintenance'),
          ),
        ],
      ),
    );
  }
}


