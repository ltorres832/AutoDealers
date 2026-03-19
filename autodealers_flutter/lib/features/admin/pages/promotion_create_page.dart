// Página de Crear Promoción (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/promotions_provider.dart';

class AdminPromotionCreatePage extends StatefulWidget {
  const AdminPromotionCreatePage({super.key});

  @override
  State<AdminPromotionCreatePage> createState() => _AdminPromotionCreatePageState();
}

class _AdminPromotionCreatePageState extends State<AdminPromotionCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _discountController = TextEditingController();
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _discountController.dispose();
    super.dispose();
  }

  Future<void> _createPromotion() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<PromotionsProvider>();
    final success = await provider.createPromotion({
      'title': _titleController.text,
      'description': _descriptionController.text,
      'discount': double.tryParse(_discountController.text) ?? 0,
      'startDate': _startDate?.toIso8601String(),
      'endDate': _endDate?.toIso8601String(),
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

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear Promoción'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _createPromotion,
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
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Título',
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
              TextFormField(
                controller: _discountController,
                decoration: const InputDecoration(
                  labelText: 'Descuento (%)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Requerido';
                  if (double.tryParse(value) == null) return 'Número inválido';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Fecha de Inicio'),
                subtitle: Text(_startDate?.toString().split(' ')[0] ?? 'Seleccionar fecha'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () => _selectDate(context, true),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Fecha de Fin'),
                subtitle: Text(_endDate?.toString().split(' ')[0] ?? 'Seleccionar fecha'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () => _selectDate(context, false),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


