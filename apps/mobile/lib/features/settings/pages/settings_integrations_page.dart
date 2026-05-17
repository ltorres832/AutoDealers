import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/firebase_config.dart';
import '../../../core/widgets/social_icon.dart';
import '../../auth/providers/auth_provider.dart';

class SettingsIntegrationsPage extends StatefulWidget {
  const SettingsIntegrationsPage({super.key});

  @override
  State<SettingsIntegrationsPage> createState() => _SettingsIntegrationsPageState();
}

class _SettingsIntegrationsPageState extends State<SettingsIntegrationsPage> {
  String? _connecting;

  static const _defaults = [
    {'type': 'whatsapp', 'name': 'WhatsApp Business', 'description': 'Conecta WhatsApp Business para mensajes'},
    {'type': 'facebook', 'name': 'Facebook', 'description': 'Debes ser administrador de la página para publicar y gestionar mensajes.'},
    {'type': 'instagram', 'name': 'Instagram', 'description': 'Conecta Instagram para publicar y mensajes directos'},
  ];

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: error ? Colors.red : Colors.green),
    );
  }

  Future<void> _connect(String type, String tenantId) async {
    if (type == 'whatsapp') {
      final phone = TextEditingController();
      final token = TextEditingController();
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('WhatsApp Business'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: phone, decoration: const InputDecoration(labelText: 'Phone Number ID')),
              TextField(controller: token, decoration: const InputDecoration(labelText: 'Access Token'), obscureText: true),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Conectar')),
          ],
        ),
      );
      if (ok != true) return;
      setState(() => _connecting = type);
      try {
        await FirebaseFunctions.instance.httpsCallable('connectIntegration').call({
          'tenantId': tenantId,
          'type': type,
          'credentials': {'phoneNumberId': phone.text.trim(), 'accessToken': token.text.trim()},
        });
        _snack('WhatsApp conectado');
      } catch (e) {
        _snack(e.toString(), error: true);
      } finally {
        if (mounted) setState(() => _connecting = null);
      }
      return;
    }

    setState(() => _connecting = type);
    try {
      final result = await FirebaseFunctions.instance.httpsCallable('connectIntegration').call({
        'tenantId': tenantId,
        'type': type,
      });
      final data = Map<String, dynamic>.from(result.data as Map);
      final authUrl = data['authUrl']?.toString();
      if (authUrl != null) {
        await launchUrl(Uri.parse(authUrl), mode: LaunchMode.externalApplication);
      } else {
        _snack(data['error']?.toString() ?? data['message']?.toString() ?? 'No se pudo iniciar OAuth', error: true);
      }
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _connecting = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tenantId = context.watch<AuthProvider>().userData?['tenantId']?.toString();
    if (tenantId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Integraciones')),
        body: const Center(child: Text('Sesión sin tenant')),
      );
    }

    final stream = FirebaseConfig.firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .snapshots();

    return Scaffold(
      appBar: AppBar(title: const Text('Integraciones')),
      body: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
        stream: stream,
        builder: (context, snapshot) {
          final fromDb = snapshot.data?.docs.map((d) => {'id': d.id, ...d.data()}).toList() ?? [];

          return ListView(
            padding: const EdgeInsets.all(16),
            children: _defaults.map((platform) {
              final type = platform['type']!;
              Map<String, dynamic>? existing;
              for (final i in fromDb) {
                if (i['type'] == type) {
                  existing = i;
                  break;
                }
              }
              final active = existing?['status'] == 'active';
              final connecting = _connecting == type;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: SocialIcon(platform: type),
                  title: Text(platform['name']!),
                  subtitle: Text(platform['description']!),
                  trailing: active
                      ? const Chip(label: Text('Conectado'))
                      : FilledButton(
                          onPressed: connecting ? null : () => _connect(type, tenantId),
                          child: Text(connecting ? '...' : 'Conectar'),
                        ),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }
}
