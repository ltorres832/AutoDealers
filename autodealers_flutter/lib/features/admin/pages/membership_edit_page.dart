// Página de Editar Membresía (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/billing_provider.dart';

class AdminMembershipEditPage extends StatefulWidget {
  final String membershipId;

  const AdminMembershipEditPage({super.key, required this.membershipId});

  @override
  State<AdminMembershipEditPage> createState() => _AdminMembershipEditPageState();
}

class _AdminMembershipEditPageState extends State<AdminMembershipEditPage> {
  final _nameController = TextEditingController();
  final _priceController = TextEditingController();
  bool _isActive = true;
  String? _loadedId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BillingProvider>().loadMembershipById(widget.membershipId);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Editar Membresía'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _save,
          ),
        ],
      ),
      body: Consumer<BillingProvider>(
        builder: (context, billingProvider, _) {
          if (billingProvider.isLoading && billingProvider.selectedMembership == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (billingProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${billingProvider.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => billingProvider.loadMembershipById(widget.membershipId),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          final m = billingProvider.selectedMembership;
          if (m == null) {
            return const Center(child: Text('Membresía no encontrada'));
          }
          // Rellenar controladores una vez cuando llega la membresía
          if (_loadedId != m['id']) {
            _loadedId = m['id']?.toString();
            _nameController.text = m['name']?.toString() ?? '';
            _priceController.text = (m['price'] ?? '').toString();
            _isActive = m['isActive'] != false;
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nombre',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _priceController,
                  decoration: const InputDecoration(
                    labelText: 'Precio',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Text('Activa'),
                    const SizedBox(width: 16),
                    Switch(
                      value: _isActive,
                      onChanged: (v) => setState(() => _isActive = v),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: billingProvider.isLoading ? null : _save,
                  child: const Text('Guardar cambios'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El nombre es obligatorio')),
      );
      return;
    }
    final price = double.tryParse(_priceController.text.trim());
    final billingProvider = context.read<BillingProvider>();
    final ok = await billingProvider.updateMembership(widget.membershipId, {
      'name': name,
      'price': price,
      'isActive': _isActive,
    });
    if (context.mounted) {
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Membresía actualizada')),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${billingProvider.error}')),
        );
      }
    }
  }
}

