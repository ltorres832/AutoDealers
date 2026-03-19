// Página de Crear Lead
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/lead.dart';
import '../../dealer/widgets/dealer_drawer.dart';
import '../../seller/widgets/seller_drawer.dart';

class CreateLeadPage extends StatefulWidget {
  const CreateLeadPage({super.key});

  @override
  State<CreateLeadPage> createState() => _CreateLeadPageState();
}

class _CreateLeadPageState extends State<CreateLeadPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _notesController = TextEditingController();

  LeadSource _selectedSource = LeadSource.web;
  String _preferredChannel = 'whatsapp';

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final crmProvider = context.read<CrmProvider>();

    if (authProvider.user?.tenantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error: No se encontró tenantId')),
      );
      return;
    }

    final lead = Lead(
      id: '', // Se generará en el repositorio
      tenantId: authProvider.user!.tenantId!,
      source: _selectedSource,
      status: LeadStatus.new_,
      contact: LeadContact(
        name: _nameController.text.trim(),
        email: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        preferredChannel: _preferredChannel,
      ),
      notes: _notesController.text.trim(),
      interactions: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    final success = await crmProvider.createLead(lead);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lead creado exitosamente')),
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
    final path = GoRouterState.of(context).uri.path;
    final drawer = path.startsWith('/dealer/')
        ? const DealerDrawer()
        : path.startsWith('/seller/')
            ? const SellerDrawer()
            : null;
    return Scaffold(
      drawer: drawer,
      appBar: AppBar(
        title: const Text('Crear Lead'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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
              DropdownButtonFormField<LeadSource>(
                value: _selectedSource,
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
                      _selectedSource = value;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _preferredChannel,
                decoration: const InputDecoration(
                  labelText: 'Canal Preferido',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'whatsapp', child: Text('WhatsApp')),
                  DropdownMenuItem(value: 'email', child: Text('Email')),
                  DropdownMenuItem(value: 'sms', child: Text('SMS')),
                  DropdownMenuItem(value: 'phone', child: Text('Teléfono')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _preferredChannel = value;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
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
                    onPressed: crmProvider.isLoading ? null : _handleCreate,
                    child: crmProvider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Crear Lead'),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}


