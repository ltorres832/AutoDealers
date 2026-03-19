// Página de Crear Cita
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/presentation/providers/appointments_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/appointment.dart';
import '../../../core/domain/models/lead.dart';
import '../../../core/domain/models/vehicle.dart';

class CreateAppointmentPage extends StatefulWidget {
  final String? leadId;

  const CreateAppointmentPage({super.key, this.leadId});

  @override
  State<CreateAppointmentPage> createState() => _CreateAppointmentPageState();
}

class _CreateAppointmentPageState extends State<CreateAppointmentPage> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  final _locationController = TextEditingController();

  AppointmentType _type = AppointmentType.consultation;
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  int _duration = 60;
  String? _selectedLeadId;
  String? _selectedAssignedTo;
  List<String> _selectedVehicleIds = [];

  @override
  void initState() {
    super.initState();
    _selectedLeadId = widget.leadId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final crmProvider = context.read<CrmProvider>();
      final inventoryProvider = context.read<InventoryProvider>();
      
      if (authProvider.user?.tenantId != null) {
        crmProvider.initialize(authProvider.user!.tenantId);
        inventoryProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null || _selectedTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona fecha y hora')),
      );
      return;
    }
    if (_selectedLeadId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona un lead')),
      );
      return;
    }

    final authProvider = context.read<AuthProvider>();
    final appointmentsProvider = context.read<AppointmentsProvider>();

    if (authProvider.user?.tenantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error: No se encontró tenantId')),
      );
      return;
    }

    final scheduledAt = DateTime(
      _selectedDate!.year,
      _selectedDate!.month,
      _selectedDate!.day,
      _selectedTime!.hour,
      _selectedTime!.minute,
    );

    final appointment = Appointment(
      id: '',
      tenantId: authProvider.user!.tenantId!,
      leadId: _selectedLeadId!,
      assignedTo: _selectedAssignedTo ?? authProvider.user!.id,
      vehicleIds: _selectedVehicleIds,
      type: _type,
      scheduledAt: scheduledAt,
      duration: _duration,
      status: AppointmentStatus.scheduled,
      location: _locationController.text.trim().isNotEmpty
          ? _locationController.text.trim()
          : null,
      notes: _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
      reminders: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    final success = await appointmentsProvider.createAppointment(appointment);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cita creada exitosamente')),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${appointmentsProvider.error}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear Cita'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Seleccionar Lead
              Consumer<CrmProvider>(
                builder: (context, crmProvider, _) {
                  return DropdownButtonFormField<String>(
                    value: _selectedLeadId,
                    decoration: const InputDecoration(
                      labelText: 'Lead *',
                      border: OutlineInputBorder(),
                    ),
                    items: crmProvider.leads.map((lead) {
                      return DropdownMenuItem(
                        value: lead.id,
                        child: Text('${lead.contact.name} - ${lead.contact.phone}'),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedLeadId = value;
                      });
                    },
                    validator: (value) {
                      if (value == null) {
                        return 'Selecciona un lead';
                      }
                      return null;
                    },
                  );
                },
              ),
              const SizedBox(height: 16),
              // Tipo de cita
              DropdownButtonFormField<AppointmentType>(
                value: _type,
                decoration: const InputDecoration(
                  labelText: 'Tipo de Cita *',
                  border: OutlineInputBorder(),
                ),
                items: AppointmentType.values.map((type) {
                  return DropdownMenuItem(
                    value: type,
                    child: Text(_getTypeName(type)),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _type = value;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              // Fecha y hora
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _selectDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Fecha *',
                          border: OutlineInputBorder(),
                        ),
                        child: Text(
                          _selectedDate != null
                              ? DateFormat('dd/MM/yyyy').format(_selectedDate!)
                              : 'Seleccionar fecha',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: InkWell(
                      onTap: _selectTime,
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Hora *',
                          border: OutlineInputBorder(),
                        ),
                        child: Text(
                          _selectedTime != null
                              ? _selectedTime!.format(context)
                              : 'Seleccionar hora',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Duración
              TextFormField(
                initialValue: _duration.toString(),
                decoration: const InputDecoration(
                  labelText: 'Duración (minutos) *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  final duration = int.tryParse(value);
                  if (duration != null) {
                    setState(() {
                      _duration = duration;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              // Ubicación
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Ubicación',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              // Notas
              TextFormField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Notas',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
              ),
              const SizedBox(height: 24),
              Consumer<AppointmentsProvider>(
                builder: (context, appointmentsProvider, _) {
                  return ElevatedButton(
                    onPressed: appointmentsProvider.isLoading ? null : _handleCreate,
                    child: appointmentsProvider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Crear Cita'),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
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
}


