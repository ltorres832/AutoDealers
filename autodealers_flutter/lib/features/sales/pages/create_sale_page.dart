// Página de Crear Venta
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/sales_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/sale.dart';
import '../../../core/domain/models/lead.dart';
import '../../../core/domain/models/vehicle.dart';

class CreateSalePage extends StatefulWidget {
  final String? vehicleId;
  final String? leadId;

  const CreateSalePage({super.key, this.vehicleId, this.leadId});

  @override
  State<CreateSalePage> createState() => _CreateSalePageState();
}

class _CreateSalePageState extends State<CreateSalePage> {
  final _formKey = GlobalKey<FormState>();
  final _buyerNameController = TextEditingController();
  final _buyerPhoneController = TextEditingController();
  final _buyerEmailController = TextEditingController();
  final _driverLicenseController = TextEditingController();
  final _vehiclePlateController = TextEditingController();
  final _salePriceController = TextEditingController();
  final _vehiclePriceController = TextEditingController();
  final _bonus1Controller = TextEditingController();
  final _bonus2Controller = TextEditingController();
  final _rebateController = TextEditingController();
  final _tablillaController = TextEditingController();
  final _insuranceController = TextEditingController();
  final _accessoriesController = TextEditingController();
  final _otherController = TextEditingController();
  final _notesController = TextEditingController();

  String? _selectedVehicleId;
  String? _selectedLeadId;
  String _paymentMethod = 'cash';
  double _total = 0.0;
  String _currency = 'USD';

  @override
  void initState() {
    super.initState();
    _selectedVehicleId = widget.vehicleId;
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
    _buyerNameController.dispose();
    _buyerPhoneController.dispose();
    _buyerEmailController.dispose();
    _driverLicenseController.dispose();
    _vehiclePlateController.dispose();
    _salePriceController.dispose();
    _vehiclePriceController.dispose();
    _bonus1Controller.dispose();
    _bonus2Controller.dispose();
    _rebateController.dispose();
    _tablillaController.dispose();
    _insuranceController.dispose();
    _accessoriesController.dispose();
    _otherController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _calculateTotal() {
    final salePrice = double.tryParse(_salePriceController.text) ?? 0;
    final bonus1 = double.tryParse(_bonus1Controller.text) ?? 0;
    final bonus2 = double.tryParse(_bonus2Controller.text) ?? 0;
    final rebate = double.tryParse(_rebateController.text) ?? 0;
    final tablilla = double.tryParse(_tablillaController.text) ?? 0;
    final insurance = double.tryParse(_insuranceController.text) ?? 0;
    final accessories = double.tryParse(_accessoriesController.text) ?? 0;
    final other = double.tryParse(_otherController.text) ?? 0;

    setState(() {
      _total = salePrice + bonus1 + bonus2 + rebate + tablilla + insurance + accessories + other;
    });
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedVehicleId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona un vehículo')),
      );
      return;
    }

    final authProvider = context.read<AuthProvider>();
    final salesProvider = context.read<SalesProvider>();

    if (authProvider.user?.tenantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error: No se encontró tenantId')),
      );
      return;
    }

    final salePrice = double.parse(_salePriceController.text);
    final vehiclePrice = double.parse(_vehiclePriceController.text);

    final sale = Sale(
      id: '',
      tenantId: authProvider.user!.tenantId!,
      leadId: _selectedLeadId,
      vehicleId: _selectedVehicleId!,
      sellerId: authProvider.user!.id,
      buyer: BuyerInfo(
        fullName: _buyerNameController.text.trim(),
        phone: _buyerPhoneController.text.trim(),
        email: _buyerEmailController.text.trim(),
        driverLicenseNumber: _driverLicenseController.text.trim().isNotEmpty
            ? _driverLicenseController.text.trim()
            : null,
        vehiclePlate: _vehiclePlateController.text.trim().isNotEmpty
            ? _vehiclePlateController.text.trim()
            : null,
      ),
      salePrice: salePrice,
      vehiclePrice: vehiclePrice,
      bonus1: _bonus1Controller.text.trim().isNotEmpty
          ? double.tryParse(_bonus1Controller.text)
          : null,
      bonus2: _bonus2Controller.text.trim().isNotEmpty
          ? double.tryParse(_bonus2Controller.text)
          : null,
      rebate: _rebateController.text.trim().isNotEmpty
          ? double.tryParse(_rebateController.text)
          : null,
      tablilla: _tablillaController.text.trim().isNotEmpty
          ? double.tryParse(_tablillaController.text)
          : null,
      insurance: _insuranceController.text.trim().isNotEmpty
          ? double.tryParse(_insuranceController.text)
          : null,
      accessories: _accessoriesController.text.trim().isNotEmpty
          ? double.tryParse(_accessoriesController.text)
          : null,
      other: _otherController.text.trim().isNotEmpty
          ? double.tryParse(_otherController.text)
          : null,
      total: _total,
      currency: _currency,
      paymentMethod: _paymentMethod,
      status: SaleStatus.pending,
      documents: [],
      notes: _notesController.text.trim(),
      createdAt: DateTime.now(),
    );

    final success = await salesProvider.createSale(sale);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Venta creada exitosamente')),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${salesProvider.error}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear Venta'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Seleccionar Vehículo
              Consumer<InventoryProvider>(
                builder: (context, inventoryProvider, _) {
                  return DropdownButtonFormField<String>(
                    initialValue: _selectedVehicleId,
                    decoration: const InputDecoration(
                      labelText: 'Vehículo *',
                      border: OutlineInputBorder(),
                    ),
                    items: inventoryProvider.vehicles
                        .where((v) => v.status == VehicleStatus.available)
                        .map((vehicle) {
                      return DropdownMenuItem(
                        value: vehicle.id,
                        child: Text('${vehicle.year} ${vehicle.make} ${vehicle.model}'),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedVehicleId = value;
                        if (value != null) {
                          final vehicle = inventoryProvider.vehicles
                              .firstWhere((v) => v.id == value);
                          _vehiclePriceController.text = vehicle.price.toString();
                          _currency = vehicle.currency;
                          _calculateTotal();
                        }
                      });
                    },
                    validator: (value) {
                      if (value == null) {
                        return 'Selecciona un vehículo';
                      }
                      return null;
                    },
                  );
                },
              ),
              const SizedBox(height: 16),
              // Seleccionar Lead (opcional)
              Consumer<CrmProvider>(
                builder: (context, crmProvider, _) {
                  return DropdownButtonFormField<String>(
                    initialValue: _selectedLeadId,
                    decoration: const InputDecoration(
                      labelText: 'Lead (Opcional)',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Ninguno')),
                      ...crmProvider.leads.map((lead) {
                        return DropdownMenuItem(
                          value: lead.id,
                          child: Text('${lead.contact.name} - ${lead.contact.phone}'),
                        );
                      }),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedLeadId = value;
                        if (value != null) {
                          final lead = crmProvider.leads.firstWhere((l) => l.id == value);
                          _buyerNameController.text = lead.contact.name;
                          _buyerPhoneController.text = lead.contact.phone;
                          _buyerEmailController.text = lead.contact.email ?? '';
                        }
                      });
                    },
                  );
                },
              ),
              const SizedBox(height: 16),
              // Información del Comprador
              const Text(
                'Información del Comprador',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _buyerNameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre Completo *',
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
                controller: _buyerPhoneController,
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
              TextFormField(
                controller: _buyerEmailController,
                decoration: const InputDecoration(
                  labelText: 'Email *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El email es requerido';
                  }
                  if (!value.contains('@')) {
                    return 'Email inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _driverLicenseController,
                decoration: const InputDecoration(
                  labelText: 'Número de Licencia',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _vehiclePlateController,
                decoration: const InputDecoration(
                  labelText: 'Tablilla del Vehículo',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              // Precios y Desglose
              const Text(
                'Precios y Desglose',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _vehiclePriceController,
                decoration: const InputDecoration(
                  labelText: 'Precio del Vehículo *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) => _calculateTotal(),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El precio es requerido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _salePriceController,
                decoration: const InputDecoration(
                  labelText: 'Precio Final de Venta *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) => _calculateTotal(),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El precio de venta es requerido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _bonus1Controller,
                      decoration: const InputDecoration(
                        labelText: 'Bono 1',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (_) => _calculateTotal(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _bonus2Controller,
                      decoration: const InputDecoration(
                        labelText: 'Bono 2',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (_) => _calculateTotal(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _rebateController,
                      decoration: const InputDecoration(
                        labelText: 'Rebate',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (_) => _calculateTotal(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _tablillaController,
                      decoration: const InputDecoration(
                        labelText: 'Tablilla',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (_) => _calculateTotal(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _insuranceController,
                      decoration: const InputDecoration(
                        labelText: 'Seguro',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (_) => _calculateTotal(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _accessoriesController,
                      decoration: const InputDecoration(
                        labelText: 'Accesorios',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      onChanged: (_) => _calculateTotal(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _otherController,
                decoration: const InputDecoration(
                  labelText: 'Otros',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) => _calculateTotal(),
              ),
              const SizedBox(height: 16),
              // Total
              Card(
                color: Colors.blue[50],
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total:',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '$_currency ${_total.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Método de pago
              DropdownButtonFormField<String>(
                initialValue: _paymentMethod,
                decoration: const InputDecoration(
                  labelText: 'Método de Pago *',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('Efectivo')),
                  DropdownMenuItem(value: 'check', child: Text('Cheque')),
                  DropdownMenuItem(value: 'credit_card', child: Text('Tarjeta de Crédito')),
                  DropdownMenuItem(value: 'bank_transfer', child: Text('Transferencia Bancaria')),
                  DropdownMenuItem(value: 'financing', child: Text('Financiamiento')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _paymentMethod = value;
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
              Consumer<SalesProvider>(
                builder: (context, salesProvider, _) {
                  return ElevatedButton(
                    onPressed: salesProvider.isLoading ? null : _handleCreate,
                    child: salesProvider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Crear Venta'),
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


