// Crear usuario (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminUserCreatePage extends StatefulWidget {
  const AdminUserCreatePage({super.key});

  @override
  State<AdminUserCreatePage> createState() => _AdminUserCreatePageState();
}

class _AdminUserCreatePageState extends State<AdminUserCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  String _role = 'dealer';
  String? _tenantId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadTenants();
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final provider = context.read<AdminProvider>();
    final result = await provider.createUser({
      'email': _email.text.trim(),
      'password': _password.text.trim(),
      'name': _name.text.trim(),
      'role': _role,
      if (_tenantId != null && _tenantId!.isNotEmpty) 'tenantId': _tenantId,
    });
    if (!mounted) return;
    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Usuario creado')));
      context.go('/admin/users');
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
        title: const Text('Crear usuario'),
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
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email *'),
              keyboardType: TextInputType.emailAddress,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _password,
              decoration: const InputDecoration(labelText: 'Contraseña *'),
              obscureText: true,
              validator: (v) => (v == null || v.isEmpty || v.length < 6) ? 'Mínimo 6 caracteres' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Nombre *'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _role,
              decoration: const InputDecoration(labelText: 'Rol'),
              items: const [
                DropdownMenuItem(value: 'admin', child: Text('Admin')),
                DropdownMenuItem(value: 'dealer', child: Text('Dealer')),
                DropdownMenuItem(value: 'seller', child: Text('Seller')),
              ],
              onChanged: (v) => setState(() => _role = v ?? 'dealer'),
            ),
            const SizedBox(height: 12),
            Consumer<AdminProvider>(
              builder: (context, adminProvider, _) {
                final tenants = adminProvider.tenants;
                return DropdownButtonFormField<String>(
                  initialValue: _tenantId,
                  decoration: const InputDecoration(labelText: 'Tenant (opcional)'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('— Ninguno —')),
                    ...tenants.map((t) {
                      final id = t['id'] as String? ?? '';
                      final name = t['name'] as String? ?? id;
                      return DropdownMenuItem(value: id.isEmpty ? null : id, child: Text(name));
                    }),
                  ],
                  onChanged: (v) => setState(() => _tenantId = v),
                );
              },
            ),
            const SizedBox(height: 24),
            Consumer<AdminProvider>(
              builder: (context, provider, _) {
                return ElevatedButton(
                  onPressed: provider.isLoading ? null : _submit,
                  child: provider.isLoading
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Crear usuario'),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}


