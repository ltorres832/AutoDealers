// Página de Editar Lead
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/lead.dart';
import '../../dealer/widgets/dealer_drawer.dart';
import '../../seller/widgets/seller_drawer.dart';

class EditLeadPage extends StatefulWidget {
  final String leadId;

  const EditLeadPage({super.key, required this.leadId});

  @override
  State<EditLeadPage> createState() => _EditLeadPageState();
}

class _EditLeadPageState extends State<EditLeadPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _notesController = TextEditingController();

  LeadStatus _status = LeadStatus.new_;
  LeadSource _source = LeadSource.web;
  String? _assignedTo;
  Lead? _lead;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final crmProvider = context.read<CrmProvider>();
      
      if (authProvider.user?.tenantId != null) {
        crmProvider.initialize(authProvider.user!.tenantId);
      }
      
      // Cargar lead
      _loadLead();
    });
  }

  void _loadLead() {
    final crmProvider = context.read<CrmProvider>();
    final lead = crmProvider.leads.firstWhere(
      (l) => l.id == widget.leadId,
      orElse: () => crmProvider.selectedLead!,
    );

    setState(() {
      _lead = lead;
      _nameController.text = lead.contact.name;
      _emailController.text = lead.contact.email ?? '';
      _phoneController.text = lead.contact.phone;
      _notesController.text = lead.notes;
      _status = lead.status;
      _source = lead.source;
      _assignedTo = lead.assignedTo;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    if (_lead == null) return;

    final crmProvider = context.read<CrmProvider>();

    final updates = {
      'status': _status.name.replaceAll('_', ''),
      'source': _source.name,
      'contact': {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim().isNotEmpty
            ? _emailController.text.trim()
            : null,
        'phone': _phoneController.text.trim(),
        'preferredChannel': _lead!.contact.preferredChannel,
      },
      'notes': _notesController.text.trim(),
      if (_assignedTo != null) 'assignedTo': _assignedTo,
    };

    final success = await crmProvider.updateLead(_lead!.id, updates);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lead actualizado exitosamente')),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${crmProvider.error}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_lead == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final path = GoRouterState.of(context).uri.path;
    final drawer = path.startsWith('/dealer/')
        ? const DealerDrawer()
        : path.startsWith('/seller/')
            ? const SellerDrawer()
            : null;
    return Scaffold(
      drawer: drawer,
      appBar: AppBar(
        title: const Text('Editar Lead'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _handleSave,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Información de contacto
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El nombre es requerido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Teléfono *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El teléfono es requerido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Estado
              DropdownButtonFormField<LeadStatus>(
                value: _status,
                decoration: const InputDecoration(
                  labelText: 'Estado *',
                  border: OutlineInputBorder(),
                ),
                items: LeadStatus.values.map((status) {
                  return DropdownMenuItem(
                    value: status,
                    child: Text(_getStatusName(status)),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _status = value;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              // Fuente
              DropdownButtonFormField<LeadSource>(
                value: _source,
                decoration: const InputDecoration(
                  labelText: 'Fuente *',
                  border: OutlineInputBorder(),
                ),
                items: LeadSource.values.map((source) {
                  return DropdownMenuItem(
                    value: source,
                    child: Text(source.name),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _source = value;
                    });
                  }
                },
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
              Consumer<CrmProvider>(
                builder: (context, crmProvider, _) {
                  return ElevatedButton(
                    onPressed: crmProvider.isLoading ? null : _handleSave,
                    child: crmProvider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Guardar Cambios'),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getStatusName(LeadStatus status) {
    switch (status) {
      case LeadStatus.new_:
        return 'Nuevo';
      case LeadStatus.contacted:
        return 'Contactado';
      case LeadStatus.qualified:
        return 'Calificado';
      case LeadStatus.preQualified:
        return 'Pre-Calificado';
      case LeadStatus.appointment:
        return 'Cita';
      case LeadStatus.testDrive:
        return 'Prueba de Manejo';
      case LeadStatus.negotiation:
        return 'Negociación';
      case LeadStatus.closed:
        return 'Cerrado';
      case LeadStatus.lost:
        return 'Perdido';
    }
  }
}


