// Página Principal de Configuración del Dealer
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/dealer_drawer.dart';

class DealerSettingsPage extends StatelessWidget {
  const DealerSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Configuración'),
      ),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Perfil'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/profile'),
          ),
          ListTile(
            leading: const Icon(Icons.card_membership),
            title: const Text('Membresía'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/membership'),
          ),
          ListTile(
            leading: const Icon(Icons.payment),
            title: const Text('Métodos de Pago'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/payment-methods'),
          ),
          ListTile(
            leading: const Icon(Icons.extension),
            title: const Text('Integraciones'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/integrations'),
          ),
          ListTile(
            leading: const Icon(Icons.branding_watermark),
            title: const Text('Branding'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/branding'),
          ),
          ListTile(
            leading: const Icon(Icons.email),
            title: const Text('Emails Corporativos'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/corporate-emails'),
          ),
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Plantillas'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/templates'),
          ),
          ListTile(
            leading: const Icon(Icons.policy),
            title: const Text('Políticas'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/policies'),
          ),
          ListTile(
            leading: const Icon(Icons.smart_toy),
            title: const Text('Configuración IA'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/ai'),
          ),
          ListTile(
            leading: const Icon(Icons.web),
            title: const Text('Sitio Web'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/website'),
          ),
          ListTile(
            leading: const Icon(Icons.account_balance),
            title: const Text('Gestor FI'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/dealer/settings/fi-manager'),
          ),
        ],
      ),
    );
  }
}


