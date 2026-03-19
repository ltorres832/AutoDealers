// Página de Lista de Citas
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/presentation/providers/appointments_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/appointment.dart';

class AppointmentsListPage extends StatefulWidget {
  const AppointmentsListPage({super.key});

  @override
  State<AppointmentsListPage> createState() => _AppointmentsListPageState();
}

class _AppointmentsListPageState extends State<AppointmentsListPage> {
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
      appBar: AppBar(
        title: const Text('Citas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/appointments/create'),
          ),
        ],
      ),
      body: Consumer<AppointmentsProvider>(
        builder: (context, appointmentsProvider, _) {
          if (appointmentsProvider.isLoading && appointmentsProvider.appointments.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (appointmentsProvider.error != null) {
            return Center(
              child: Text('Error: ${appointmentsProvider.error}'),
            );
          }

          if (appointmentsProvider.appointments.isEmpty) {
            return const Center(
              child: Text('No hay citas programadas'),
            );
          }

          return ListView.builder(
            itemCount: appointmentsProvider.appointments.length,
            itemBuilder: (context, index) {
              final appointment = appointmentsProvider.appointments[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(appointment.status),
                    child: Icon(
                      _getTypeIcon(appointment.type),
                      color: Colors.white,
                    ),
                  ),
                  title: Text(_getTypeName(appointment.type)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        DateFormat('dd/MM/yyyy HH:mm').format(appointment.scheduledAt),
                      ),
                      Text('Estado: ${_getStatusName(appointment.status)}'),
                    ],
                  ),
                  trailing: Icon(_getStatusIcon(appointment.status)),
                  onTap: () {
                    // Navegar a detalle de cita cuando se implemente
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  IconData _getTypeIcon(AppointmentType type) {
    switch (type) {
      case AppointmentType.consultation:
        return Icons.chat;
      case AppointmentType.testDrive:
        return Icons.directions_car;
      case AppointmentType.delivery:
        return Icons.local_shipping;
    }
  }

  String _getTypeName(AppointmentType type) {
    switch (type) {
      case AppointmentType.consultation:
        return 'Consulta';
      case AppointmentType.testDrive:
        return 'Prueba de Manejo';
      case AppointmentType.delivery:
        return 'Entrega';
    }
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return Colors.blue;
      case AppointmentStatus.confirmed:
        return Colors.green;
      case AppointmentStatus.completed:
        return Colors.grey;
      case AppointmentStatus.cancelled:
        return Colors.red;
      case AppointmentStatus.noShow:
        return Colors.orange;
    }
  }

  IconData _getStatusIcon(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return Icons.schedule;
      case AppointmentStatus.confirmed:
        return Icons.check_circle;
      case AppointmentStatus.completed:
        return Icons.done;
      case AppointmentStatus.cancelled:
        return Icons.cancel;
      case AppointmentStatus.noShow:
        return Icons.person_off;
    }
  }

  String _getStatusName(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return 'Programada';
      case AppointmentStatus.confirmed:
        return 'Confirmada';
      case AppointmentStatus.completed:
        return 'Completada';
      case AppointmentStatus.cancelled:
        return 'Cancelada';
      case AppointmentStatus.noShow:
        return 'No se presentó';
    }
  }
}


