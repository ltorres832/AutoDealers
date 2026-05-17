import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../providers/integrations_provider.dart';
import '../widgets/social_icon.dart';

class SettingsIntegrationsPage extends StatefulWidget {
  const SettingsIntegrationsPage({super.key});

  @override
  State<SettingsIntegrationsPage> createState() => _SettingsIntegrationsPageState();
}

class _SettingsIntegrationsPageState extends State<SettingsIntegrationsPage> {
  String? _connectingType;

  static const _platforms = [
    {
      'type': 'whatsapp',
      'name': 'WhatsApp Business',
      'description': 'Conecta tu cuenta de WhatsApp Business para enviar y recibir mensajes',
    },
    {
      'type': 'facebook',
      'name': 'Facebook',
      'description': 'Debes ser administrador de la página para publicar y gestionar mensajes.',
    },
    {
      'type': 'instagram',
      'name': 'Instagram',
      'description': 'Conecta tu cuenta de Instagram para publicar y gestionar mensajes directos',
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final tenantId = context.read<AuthProvider>().user?.tenantId;
      if (tenantId != null) {
        context.read<IntegrationsProvider>().initialize(tenantId);
      }
    });
  }

  List<Map<String, dynamic>> _merged(IntegrationsProvider provider) {
    return _platforms.map((platform) {
      final type = platform['type'] as String;
      Map<String, dynamic>? existing;
      for (final i in provider.integrations) {
        if (i['type'] == type) {
          existing = i;
          break;
        }
      }
      if (existing != null) {
        return {
          ...platform,
          'id': existing['id'],
          'status': existing['status'] ?? 'inactive',
        };
      }
      return {
        ...platform,
        'id': type,
        'status': 'inactive',
      };
    }).toList();
  }

  bool _isActive(Map<String, dynamic> integration) {
    return integration['status'] == 'active';
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
      ),
    );
  }

  Future<void> _connect(String type) async {
    if (type == 'whatsapp') {
      await _showWhatsAppDialog();
      return;
    }

    setState(() => _connectingType = type);
    final provider = context.read<IntegrationsProvider>();
    try {
      final result = await provider.connectIntegration(type);
      final authUrl = result?['authUrl']?.toString();
      if (authUrl != null && authUrl.isNotEmpty) {
        final uri = Uri.parse(authUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          _showSnack('No se pudo abrir el enlace de autorización', isError: true);
        }
      } else if (provider.error != null) {
        _showSnack(provider.error!, isError: true);
      } else if (result?['error'] != null) {
        _showSnack(result!['error'].toString(), isError: true);
      }
    } catch (e) {
      _showSnack(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _connectingType = null);
    }
  }

  Future<void> _showWhatsAppDialog() async {
    final phoneController = TextEditingController();
    final tokenController = TextEditingController();

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Conectar WhatsApp Business'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(labelText: 'Phone Number ID'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: tokenController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Access Token'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Conectar')),
        ],
      ),
    );

    if (ok != true || !mounted) return;
    if (phoneController.text.trim().isEmpty || tokenController.text.trim().isEmpty) {
      _showSnack('Completa todos los campos', isError: true);
      return;
    }

    final provider = context.read<IntegrationsProvider>();
    final result = await provider.connectIntegration(
      'whatsapp',
      credentials: {
        'phoneNumberId': phoneController.text.trim(),
        'accessToken': tokenController.text.trim(),
      },
    );

    if (result?['success'] == true || provider.error == null) {
      _showSnack('WhatsApp conectado correctamente');
    } else {
      _showSnack(provider.error ?? result?['error']?.toString() ?? 'Error al conectar', isError: true);
    }
  }

  Future<void> _disconnect(Map<String, dynamic> integration) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desconectar'),
        content: Text('¿Desconectar ${integration['name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Desconectar')),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    final provider = context.read<IntegrationsProvider>();
    final id = integration['id']?.toString() ?? '';
    final ok = await provider.disconnectIntegration(id);
    if (ok) {
      _showSnack('Integración desconectada');
    } else {
      _showSnack(provider.error ?? 'Error al desconectar', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Integraciones')),
      body: Consumer<IntegrationsProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.integrations.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          final items = _merged(provider);

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (provider.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(provider.error!, style: TextStyle(color: Colors.red.shade700)),
                ),
              ...items.map((integration) {
                final type = integration['type'] as String;
                final active = _isActive(integration);
                final connecting = _connectingType == type;

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: SocialIcon(platform: type, size: 28),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                integration['name'] as String,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                integration['description'] as String,
                                style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                              ),
                              if (active) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    'Conectado',
                                    style: TextStyle(
                                      color: Colors.green.shade800,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        active
                            ? OutlinedButton(
                                onPressed: () => _disconnect(integration),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.red,
                                  side: const BorderSide(color: Colors.red),
                                ),
                                child: const Text('Desconectar'),
                              )
                            : FilledButton(
                                onPressed: connecting ? null : () => _connect(type),
                                child: Text(connecting ? 'Conectando...' : 'Conectar'),
                              ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              Text(
                'Para Facebook e Instagram se abrirá el navegador para autorizar con Meta. '
                'El administrador debe configurar las credenciales de la app en el panel admin.',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          );
        },
      ),
    );
  }
}
