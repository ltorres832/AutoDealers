// Página de Modo Mantenimiento (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/maintenance_provider.dart';

class AdminMaintenancePage extends StatefulWidget {
  const AdminMaintenancePage({super.key});

  @override
  State<AdminMaintenancePage> createState() => _AdminMaintenancePageState();
}

class _AdminMaintenancePageState extends State<AdminMaintenancePage> {
  final _messageController = TextEditingController();
  DateTime? _scheduledStart;
  DateTime? _scheduledEnd;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MaintenanceProvider>().loadMaintenanceStatus();
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Modo Mantenimiento'),
      ),
      body: Consumer<MaintenanceProvider>(
        builder: (context, maintenanceProvider, _) {
          if (maintenanceProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final status = maintenanceProvider.maintenanceStatus;
          final isEnabled = status?['enabled'] == true;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: SwitchListTile(
                    title: const Text('Modo Mantenimiento'),
                    subtitle: Text(isEnabled ? 'Activo' : 'Inactivo'),
                    value: isEnabled,
                    onChanged: (value) {
                      maintenanceProvider.setMaintenanceMode(
                        enabled: value,
                        message: _messageController.text.isEmpty ? null : _messageController.text,
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _messageController,
                  decoration: const InputDecoration(
                    labelText: 'Mensaje de Mantenimiento',
                    border: OutlineInputBorder(),
                    hintText: 'El sistema está en mantenimiento...',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                ListTile(
                  title: const Text('Inicio Programado'),
                  subtitle: Text(_scheduledStart?.toString().split(' ')[0] ?? 'No programado'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _scheduledStart ?? DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setState(() => _scheduledStart = picked);
                  },
                ),
                const SizedBox(height: 16),
                ListTile(
                  title: const Text('Fin Programado'),
                  subtitle: Text(_scheduledEnd?.toString().split(' ')[0] ?? 'No programado'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _scheduledEnd ?? DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) setState(() => _scheduledEnd = picked);
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


