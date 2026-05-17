// Página de Crear Vehículo
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/data/services/storage_service.dart';
import '../../../core/domain/models/vehicle.dart';
import '../../dealer/widgets/dealer_drawer.dart';
import '../../seller/widgets/seller_drawer.dart';

class CreateVehiclePage extends StatefulWidget {
  const CreateVehiclePage({super.key});

  @override
  State<CreateVehiclePage> createState() => _CreateVehiclePageState();
}

class _CreateVehiclePageState extends State<CreateVehiclePage> {
  final _formKey = GlobalKey<FormState>();
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _yearController = TextEditingController();
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _mileageController = TextEditingController();
  final _vinController = TextEditingController();

  VehicleCondition _condition = VehicleCondition.used;
  VehicleBodyType? _bodyType;
  TransmissionType? _transmission;
  FuelType? _fuelType;
  List<File> _selectedImages = [];
  final StorageService _storageService = StorageService();

  @override
  void dispose() {
    _makeController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    _mileageController.dispose();
    _vinController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final pickedFiles = await picker.pickMultiImage();
    setState(() {
      _selectedImages = pickedFiles.map((file) => File(file.path)).toList();
    });
    }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final inventoryProvider = context.read<InventoryProvider>();

    if (authProvider.user?.tenantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error: No se encontró tenantId')),
      );
      return;
    }

    // Subir imágenes
    List<String> photoUrls = [];
    if (_selectedImages.isNotEmpty) {
      try {
        photoUrls = await _storageService.uploadImages(
          files: _selectedImages,
          path: 'vehicles',
          tenantId: authProvider.user!.tenantId,
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al subir imágenes: $e')),
        );
        return;
      }
    }

    final vehicle = Vehicle(
      id: '',
      tenantId: authProvider.user!.tenantId!,
      make: _makeController.text.trim(),
      model: _modelController.text.trim(),
      year: int.parse(_yearController.text.trim()),
      price: double.parse(_priceController.text.trim()),
      currency: 'USD',
      mileage: _mileageController.text.trim().isNotEmpty
          ? int.parse(_mileageController.text.trim())
          : null,
      condition: _condition,
      status: VehicleStatus.available,
      description: _descriptionController.text.trim(),
      photos: photoUrls,
      specifications: VehicleSpecs(
        make: _makeController.text.trim(),
        model: _modelController.text.trim(),
        year: int.parse(_yearController.text.trim()),
        mileage: _mileageController.text.trim().isNotEmpty
            ? int.parse(_mileageController.text.trim())
            : null,
        transmission: _transmission,
        fuelType: _fuelType,
        bodyType: _bodyType,
        vin: _vinController.text.trim().isNotEmpty
            ? _vinController.text.trim()
            : null,
        additional: {},
      ),
      vin: _vinController.text.trim().isNotEmpty
          ? _vinController.text.trim()
          : null,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    final success = await inventoryProvider.createVehicle(vehicle);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehículo creado exitosamente')),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${inventoryProvider.error}')),
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
        title: const Text('Crear Vehículo'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Fotos
              if (_selectedImages.isNotEmpty)
                SizedBox(
                  height: 200,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _selectedImages.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Image.file(
                          _selectedImages[index],
                          width: 200,
                          fit: BoxFit.cover,
                        ),
                      );
                    },
                  ),
                ),
              ElevatedButton.icon(
                onPressed: _pickImages,
                icon: const Icon(Icons.add_photo_alternate),
                label: const Text('Agregar Fotos'),
              ),
              const SizedBox(height: 16),
              // Información básica
              TextFormField(
                controller: _makeController,
                decoration: const InputDecoration(
                  labelText: 'Marca *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'La marca es requerida';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _modelController,
                decoration: const InputDecoration(
                  labelText: 'Modelo *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El modelo es requerido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _yearController,
                decoration: const InputDecoration(
                  labelText: 'Año *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El año es requerido';
                  }
                  final year = int.tryParse(value);
                  if (year == null || year < 1900 || year > DateTime.now().year + 1) {
                    return 'Año inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _priceController,
                decoration: const InputDecoration(
                  labelText: 'Precio *',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'El precio es requerido';
                  }
                  if (double.tryParse(value) == null) {
                    return 'Precio inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<VehicleCondition>(
                initialValue: _condition,
                decoration: const InputDecoration(
                  labelText: 'Condición *',
                  border: OutlineInputBorder(),
                ),
                items: VehicleCondition.values.map((condition) {
                  return DropdownMenuItem(
                    value: condition,
                    child: Text(condition.name),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _condition = value;
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<VehicleBodyType>(
                initialValue: _bodyType,
                decoration: const InputDecoration(
                  labelText: 'Tipo de Vehículo',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Seleccionar...')),
                  ...VehicleBodyType.values.map((type) {
                    return DropdownMenuItem(
                      value: type,
                      child: Text(type.name),
                    );
                  }),
                ],
                onChanged: (value) {
                  setState(() {
                    _bodyType = value;
                  });
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _mileageController,
                decoration: const InputDecoration(
                  labelText: 'Millaje (millas)',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _vinController,
                decoration: const InputDecoration(
                  labelText: 'VIN',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Descripción',
                  border: OutlineInputBorder(),
                ),
                maxLines: 4,
              ),
              const SizedBox(height: 24),
              Consumer<InventoryProvider>(
                builder: (context, inventoryProvider, _) {
                  return ElevatedButton(
                    onPressed: inventoryProvider.isLoading ? null : _handleCreate,
                    child: inventoryProvider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Crear Vehículo'),
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


