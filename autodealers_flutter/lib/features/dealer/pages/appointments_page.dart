// Página de Citas del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/appointments_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/appointment.dart';
import '../widgets/dealer_drawer.dart';

class DealerAppointmentsPage extends StatefulWidget {
  const DealerAppointmentsPage({super.key});

  @override
  State<DealerAppointmentsPage> createState() => _DealerAppointmentsPageState();
}

class _DealerAppointmentsPageState extends State<DealerAppointmentsPage> {
  String _statusFilter = '';
  DateTime? _dateFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final appointmentsProvider = context.read<AppointmentsProvider>();
      if (authProvider.user?.tenantId != null) {
        appointmentsProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Citas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/appointments/create'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _statusFilter.isEmpty ? null : _statusFilter,
                    decoration: const InputDecoration(
                      labelText: 'Estado',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'scheduled', child: Text('Programada')),
                      DropdownMenuItem(value: 'completed', child: Text('Completada')),
                      DropdownMenuItem(value: 'cancelled', child: Text('Cancelada')),
                    ],
                    onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ListTile(
                    title: Text(_dateFilter == null ? 'Fecha' : _formatDate(_dateFilter!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 365)),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        setState(() => _dateFilter = picked);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          // Lista de citas
          Expanded(
            child: Consumer<AppointmentsProvider>(
              builder: (context, appointmentsProvider, _) {
                if (appointmentsProvider.isLoading && appointmentsProvider.appointments.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (appointmentsProvider.error != null) {
                  return Center(
                    child: Text('Error: ${appointmentsProvider.error}'),
                  );
                }

                var filteredAppointments = appointmentsProvider.appointments;
                if (_statusFilter.isNotEmpty) {
                  filteredAppointments = filteredAppointments.where((apt) {
                    return apt.status.name == _statusFilter;
                  }).toList();
                }

                if (_dateFilter != null) {
                  filteredAppointments = filteredAppointments.where((apt) {
                    return apt.dateTime.year == _dateFilter!.year &&
                        apt.dateTime.month == _dateFilter!.month &&
                        apt.dateTime.day == _dateFilter!.day;
                  }).toList();
                }

                if (filteredAppointments.isEmpty) {
                  return const Center(
                    child: Text('No hay citas disponibles'),
                  );
                }

                return ListView.builder(
                  itemCount: filteredAppointments.length,
                  itemBuilder: (context, index) {
                    final appointment = filteredAppointments[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getStatusColor(appointment.status),
                          child: Icon(
                            _getStatusIcon(appointment.status),
                            color: Colors.white,
                          ),
                        ),
                        title: Text(appointment.title),
                        subtitle: Text(
                          '${_formatDateTime(appointment.dateTime)} • ${appointment.leadName ?? 'Sin lead'}',
                        ),
                        trailing: Chip(
                          label: Text(appointment.status.name),
                        ),
                        onTap: () {
                          context.push('/appointments/${appointment.id}');
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return Colors.blue;
      case AppointmentStatus.confirmed:
        return Colors.orange;
      case AppointmentStatus.completed:
        return Colors.green;
      case AppointmentStatus.cancelled:
        return Colors.red;
      case AppointmentStatus.noShow:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return Icons.calendar_today;
      case AppointmentStatus.confirmed:
        return Icons.check_circle_outline;
      case AppointmentStatus.completed:
        return Icons.check_circle;
      case AppointmentStatus.cancelled:
        return Icons.cancel;
      case AppointmentStatus.noShow:
        return Icons.person_off;
    }
  }
}


