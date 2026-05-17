import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/seller_drawer.dart';

class SellerSettingsPage extends StatelessWidget {
  const SellerSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Configuración'),
      ),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Perfil'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/seller/settings/profile'),
          ),
          ListTile(
            leading: const Icon(Icons.extension),
            title: const Text('Integraciones'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/seller/settings/integrations'),
          ),
          ListTile(
            leading: const Icon(Icons.description),
            title: const Text('Plantillas'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/seller/settings/templates'),
          ),
          ListTile(
            leading: const Icon(Icons.notifications),
            title: const Text('Notificaciones'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/seller/settings/notifications'),
          ),
          ListTile(
            leading: const Icon(Icons.security),
            title: const Text('Seguridad'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/seller/settings/security'),
          ),
        ],
      ),
    );
  }
}
