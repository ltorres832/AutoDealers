import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
import '../services/appointments_service.dart';
import 'package:intl/intl.dart';

/// Página completa de Citas con calendario
class AppointmentsPageComplete extends StatefulWidget {
  const AppointmentsPageComplete({super.key});

  @override
  State<AppointmentsPageComplete> createState() =>
      _AppointmentsPageCompleteState();
}

class _AppointmentsPageCompleteState extends State<AppointmentsPageComplete> {
  final AppointmentsService _appointmentsService = AppointmentsService();
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  CalendarFormat _calendarFormat = CalendarFormat.month;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Citas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateAppointmentDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Calendario
          Card(
            margin: const EdgeInsets.all(16),
            child: TableCalendar(
              firstDay: DateTime.utc(2020, 1, 1),
              lastDay: DateTime.utc(2030, 12, 31),
              focusedDay: _focusedDay,
              selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
              calendarFormat: _calendarFormat,
              onFormatChanged: (format) {
                setState(() => _calendarFormat = format);
              },
              onDaySelected: (selectedDay, focusedDay) {
                setState(() {
                  _selectedDay = selectedDay;
                  _focusedDay = focusedDay;
                });
              },
              onPageChanged: (focusedDay) {
                _focusedDay = focusedDay;
              },
              eventLoader: (day) {
                // TODO: Cargar eventos del día
                return [];
              },
            ),
          ),

          // Lista de citas del día seleccionado
          Expanded(
            child: StreamBuilder<List<Appointment>>(
              stream: _appointmentsService.watchAppointments(
                startDate: DateTime(_selectedDay.year, _selectedDay.month,
                    _selectedDay.day),
                endDate: DateTime(_selectedDay.year, _selectedDay.month,
                    _selectedDay.day, 23, 59, 59),
              ),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }

                final appointments = snapshot.data ?? [];

                if (appointments.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.calendar_today_outlined,
                            size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          'No hay citas para este día',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: appointments.length,
                  itemBuilder: (context, index) {
                    final appointment = appointments[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: const Icon(Icons.calendar_today,
                            color: Colors.blue),
                        title: Text(
                          DateFormat('HH:mm').format(appointment.scheduledAt),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormat('EEEE, dd MMMM yyyy')
                                  .format(appointment.scheduledAt),
                            ),
                            if (appointment.notes != null)
                              Text(appointment.notes!),
                          ],
                        ),
                        trailing: Chip(
                          label: Text(appointment.status),
                          backgroundColor: _getStatusColor(appointment.status),
                        ),
                        onTap: () {
                          // TODO: Navegar a detalle de cita
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

  Color _getStatusColor(String status) {
    switch (status) {
      case 'scheduled':
        return Colors.blue;
      case 'confirmed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'completed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  void _showCreateAppointmentDialog() {
    // TODO: Implementar modal de crear cita
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Crear Cita'),
        content: const Text('Funcionalidad en desarrollo'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}


