import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../data/repositories/tenant_api_repository.dart';
import '../providers/auth_provider.dart';
import '../providers/templates_provider.dart';

class SettingsTemplatesPage extends StatefulWidget {
  final TenantApp app;

  const SettingsTemplatesPage({super.key, this.app = TenantApp.dealer});

  @override
  State<SettingsTemplatesPage> createState() => _SettingsTemplatesPageState();
}

class _SettingsTemplatesPageState extends State<SettingsTemplatesPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final tenantId = context.read<AuthProvider>().user?.tenantId;
      if (tenantId != null) {
        context.read<TemplatesProvider>().initialize(
              tenantId: tenantId,
              app: widget.app,
            );
      }
    });
  }

  Future<void> _initializeDefaults() async {
    final provider = context.read<TemplatesProvider>();
    try {
      final count = await provider.initializeDefaultTemplates();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Templates inicializados. Se crearon $count template${count == 1 ? '' : 's'}.',
          ),
          backgroundColor: Colors.green.shade700,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plantillas')),
      body: Consumer<TemplatesProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.templates.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.templates.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'No hay plantillas configuradas.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: provider.isLoading ? null : _initializeDefaults,
                      child: provider.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Inicializar plantillas por defecto'),
                    ),
                  ],
                ),
              ),
            );
          }

          final byCategory = <String, List<Map<String, dynamic>>>{};
          for (final t in provider.templates) {
            final cat = t['category']?.toString() ?? 'general';
            byCategory.putIfAbsent(cat, () => []).add(t);
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              OutlinedButton.icon(
                onPressed: provider.isLoading ? null : _initializeDefaults,
                icon: const Icon(Icons.refresh),
                label: const Text('Inicializar plantillas por defecto'),
              ),
              const SizedBox(height: 16),
              ...byCategory.entries.map((entry) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.key,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    ...entry.value.map((t) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(t['name']?.toString() ?? 'Sin nombre'),
                          subtitle: Text(
                            '${t['type'] ?? ''} · ${t['category'] ?? ''}',
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                  ],
                );
              }),
            ],
          );
        },
      ),
    );
  }
}
