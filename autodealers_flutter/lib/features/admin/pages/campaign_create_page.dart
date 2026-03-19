// Página de Crear Campaña (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/campaigns_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminCampaignCreatePage extends StatefulWidget {
  const AdminCampaignCreatePage({super.key});

  @override
  State<AdminCampaignCreatePage> createState() => _AdminCampaignCreatePageState();
}

class _AdminCampaignCreatePageState extends State<AdminCampaignCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _status = 'draft';
  String _platform = 'facebook';

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _createCampaign() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<CampaignsProvider>();
    final authProvider = context.read<AuthProvider>();
    final success = await provider.createCampaign({
      'name': _nameController.text,
      'description': _descriptionController.text,
      'status': _status,
      'platform': _platform,
    });

    if (mounted) {
      if (success) {
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${provider.error}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear Campaña'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _createCampaign,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre',
                  border: OutlineInputBorder(),
                ),
                validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Descripción',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(
                  labelText: 'Estado',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'draft', child: Text('Borrador')),
                  DropdownMenuItem(value: 'active', child: Text('Activa')),
                  DropdownMenuItem(value: 'paused', child: Text('Pausada')),
                ],
                onChanged: (value) => setState(() => _status = value ?? 'draft'),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _platform,
                decoration: const InputDecoration(
                  labelText: 'Plataforma',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'facebook', child: Text('Facebook')),
                  DropdownMenuItem(value: 'instagram', child: Text('Instagram')),
                ],
                onChanged: (value) => setState(() => _platform = value ?? 'facebook'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


