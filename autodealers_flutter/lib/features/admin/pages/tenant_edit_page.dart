// Editar tenant (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminTenantEditPage extends StatefulWidget {
  const AdminTenantEditPage({super.key, required this.tenantId});
  final String tenantId;

  @override
  State<AdminTenantEditPage> createState() => _AdminTenantEditPageState();
}

class _AdminTenantEditPageState extends State<AdminTenantEditPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _subdomainController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _status = 'active';
  String? _loadedId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadTenant(widget.tenantId);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _subdomainController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final provider = context.read<AdminProvider>();
    final ok = await provider.updateTenant(widget.tenantId, {
      'name': _nameController.text.trim(),
      'subdomain': _subdomainController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      'status': _status,
    });
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tenant actualizado')));
      context.pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${provider.error ?? "No se pudo guardar"}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Editar tenant'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _save,
          ),
        ],
      ),
      body: Consumer<AdminProvider>(
        builder: (context, adminProvider, _) {
          if (adminProvider.isLoading && adminProvider.selectedTenant == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (adminProvider.error != null && adminProvider.selectedTenant == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${adminProvider.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => adminProvider.loadTenant(widget.tenantId),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          final t = adminProvider.selectedTenant;
          if (t == null) {
            return const Center(child: Text('Tenant no encontrado'));
          }
          if (_loadedId != t['id']) {
            _loadedId = t['id']?.toString();
            _nameController.text = t['name']?.toString() ?? '';
            _subdomainController.text = t['subdomain']?.toString() ?? '';
            _descriptionController.text = t['description']?.toString() ?? '';
            _status = t['status']?.toString() ?? 'active';
          }
          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Nombre'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _subdomainController,
                  decoration: const InputDecoration(labelText: 'Subdominio'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(labelText: 'Descripción'),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _status,
                  decoration: const InputDecoration(labelText: 'Estado'),
                  items: const [
                    DropdownMenuItem(value: 'active', child: Text('Activo')),
                    DropdownMenuItem(value: 'inactive', child: Text('Inactivo')),
                    DropdownMenuItem(value: 'suspended', child: Text('Suspendido')),
                  ],
                  onChanged: (v) => setState(() => _status = v ?? 'active'),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: adminProvider.isLoading ? null : _save,
                  child: const Text('Guardar'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


