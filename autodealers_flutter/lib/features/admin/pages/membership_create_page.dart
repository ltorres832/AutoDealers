// Crear membresía (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminMembershipCreatePage extends StatefulWidget {
  const AdminMembershipCreatePage({super.key});

  @override
  State<AdminMembershipCreatePage> createState() => _AdminMembershipCreatePageState();
}

class _AdminMembershipCreatePageState extends State<AdminMembershipCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _price = TextEditingController(text: '0');
  String _type = 'dealer';
  String _billingCycle = 'monthly';
  bool _isActive = true;

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final provider = context.read<AdminProvider>();
    final price = double.tryParse(_price.text.replaceAll(',', '.')) ?? 0;
    final result = await provider.createMembership({
      'name': _name.text.trim(),
      'type': _type,
      'price': price,
      'currency': 'usd',
      'billingCycle': _billingCycle,
      'isActive': _isActive,
    });
    if (!mounted) return;
    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Membresía creada')));
      context.go('/admin/memberships');
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
        title: const Text('Crear membresía'),
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
              controller: _price,
              decoration: const InputDecoration(labelText: 'Precio'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                final n = double.tryParse(v?.replaceAll(',', '.') ?? '');
                if (n == null || n < 0) return 'Indica un precio válido';
                return null;
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _billingCycle,
              decoration: const InputDecoration(labelText: 'Ciclo de facturación'),
              items: const [
                DropdownMenuItem(value: 'monthly', child: Text('Mensual')),
                DropdownMenuItem(value: 'yearly', child: Text('Anual')),
              ],
              onChanged: (v) => setState(() => _billingCycle = v ?? 'monthly'),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              title: const Text('Activa'),
              value: _isActive,
              onChanged: (v) => setState(() => _isActive = v),
            ),
            const SizedBox(height: 24),
            Consumer<AdminProvider>(
              builder: (context, provider, _) {
                return ElevatedButton(
                  onPressed: provider.isLoading ? null : _submit,
                  child: provider.isLoading
                      ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Crear membresía'),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}


