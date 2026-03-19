// Crear tenant (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminTenantCreatePage extends StatefulWidget {
  const AdminTenantCreatePage({super.key});

  @override
  State<AdminTenantCreatePage> createState() => _AdminTenantCreatePageState();
}

class _AdminTenantCreatePageState extends State<AdminTenantCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _subdomain = TextEditingController();
  final _companyName = TextEditingController();
  String _type = 'dealer';

  @override
  void dispose() {
    _name.dispose();
    _subdomain.dispose();
    _companyName.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final provider = context.read<AdminProvider>();
    final result = await provider.createTenant({
      'name': _name.text.trim(),
      'type': _type,
      'subdomain': _subdomain.text.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9-]'), ''),
      if (_type == 'dealer' && _companyName.text.trim().isNotEmpty) 'companyName': _companyName.text.trim(),
    });
    if (!mounted) return;
    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tenant creado')));
      context.go('/admin/tenants');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${provider.error ?? "No se pudo crear"}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear tenant'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Nombre *'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Tipo'),
              items: const [
                DropdownMenuItem(value: 'dealer', child: Text('Dealer')),
                DropdownMenuItem(value: 'seller', child: Text('Seller')),
              ],
              onChanged: (v) => setState(() => _type = v ?? 'dealer'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _subdomain,
              decoration: const InputDecoration(
                labelText: 'Subdominio *',
                hintText: 'solo letras, números y guiones',
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            if (_type == 'dealer') ...[
              const SizedBox(height: 12),
              TextFormField(
                controller: _companyName,
                decoration: const InputDecoration(labelText: 'Nombre de empresa (opcional)'),
              ),
            ],
            const SizedBox(height: 24),
            Consumer<AdminProvider>(
              builder: (context, provider, _) {
                return ElevatedButton(
                  onPressed: provider.isLoading ? null : _submit,
                  child: provider.isLoading
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Crear tenant'),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}


