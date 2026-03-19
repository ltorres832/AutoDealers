// Página de Configuración de Integraciones (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/integrations_provider.dart';

class AdminSettingsIntegrationsPage extends StatelessWidget {
  const AdminSettingsIntegrationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Integraciones'),
      ),
      body: Consumer<IntegrationsProvider>(
        builder: (context, integrationsProvider, _) {
          if (integrationsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final integrations = integrationsProvider.integrations;
          if (integrations.isEmpty) {
            return const Center(child: Text('No hay integraciones configuradas'));
          }

          return ListView.builder(
            itemCount: integrations.length,
            itemBuilder: (context, index) {
              final integration = integrations[index];
              final isConnected = integration['connected'] == true;
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: Icon(_getIntegrationIcon(integration['type'])),
                  title: Text(integration['name'] ?? 'Sin nombre'),
                  subtitle: Text(isConnected ? 'Conectado' : 'Desconectado'),
                  trailing: Switch(
                    value: isConnected,
                    onChanged: (value) {
                      if (value) {
                        integrationsProvider.connectIntegration(integration['type'] as String);
                      } else {
                        integrationsProvider.disconnectIntegration(integration['type'] as String);
                      }
                    },
                  ),
                  onTap: () {
                    // Mostrar detalles de la integración
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text(integration['name'] ?? ''),
                        content: Text('Tipo: ${integration['type']}\nEstado: ${isConnected ? 'Conectado' : 'Desconectado'}'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cerrar'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  IconData _getIntegrationIcon(String? type) {
    switch (type) {
      case 'whatsapp':
        return Icons.chat;
      case 'facebook':
        return Icons.facebook;
      case 'instagram':
        return Icons.camera_alt;
      case 'email':
        return Icons.email;
      case 'sms':
        return Icons.sms;
      default:
        return Icons.link;
    }
  }
}


