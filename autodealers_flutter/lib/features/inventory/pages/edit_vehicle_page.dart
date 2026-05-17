// Página de Editar Vehículo
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

class EditVehiclePage extends StatefulWidget {
  final String vehicleId;

  const EditVehiclePage({super.key, required this.vehicleId});

  @override
  State<EditVehiclePage> createState() => _EditVehiclePageState();
}

class _EditVehiclePageState extends State<EditVehiclePage> {
  final _formKey = GlobalKey<FormState>();
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _yearController = TextEditingController();
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _mileageController = TextEditingController();

  VehicleCondition _condition = VehicleCondition.used;
  VehicleStatus _status = VehicleStatus.available;
  List<String> _existingPhotos = [];
  List<File> _newPhotos = [];
  Vehicle? _vehicle;
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final inventoryProvider = context.read<InventoryProvider>();
      
      if (authProvider.user?.tenantId != null) {
        inventoryProvider.initialize(authProvider.user!.tenantId);
      }
      
      _loadVehicle();
    });
  }

  void _loadVehicle() {
    final inventoryProvider = context.read<InventoryProvider>();
    final vehicle = inventoryProvider.vehicles.firstWhere(
      (v) => v.id == widget.vehicleId,
      orElse: () => inventoryProvider.selectedVehicle!,
    );

    setState(() {
      _vehicle = vehicle;
      _makeController.text = vehicle.make;
      _modelController.text = vehicle.model;
      _yearController.text = vehicle.year.toString();
      _priceController.text = vehicle.price.toString();
      _descriptionController.text = vehicle.description;
      _mileageController.text = vehicle.mileage?.toString() ?? '';
      _condition = vehicle.condition;
      _status = vehicle.status;
      _existingPhotos = List.from(vehicle.photos);
    });
  }

  @override
  void dispose() {
    _makeController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    _mileageController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final pickedFiles = await picker.pickMultiImage();
    setState(() {
      _newPhotos.addAll(pickedFiles.map((file) => File(file.path)));
    });
    }

  void _removeExistingPhoto(String url) {
    setState(() {
      _existingPhotos.remove(url);
    });
  }

  void _removeNewPhoto(File file) {
    setState(() {
      _newPhotos.remove(file);
    });
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    if (_vehicle == null) return;

    final authProvider = context.read<AuthProvider>();
    final inventoryProvider = context.read<InventoryProvider>();

    // Subir nuevas imágenes
    List<String> newPhotoUrls = [];
    if (_newPhotos.isNotEmpty) {
      try {
        newPhotoUrls = await _storageService.uploadImages(
          files: _newPhotos,
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

    final allPhotos = [..._existingPhotos, ...newPhotoUrls];

    final updates = {
      'make': _makeController.text.trim(),
      'model': _modelController.text.trim(),
      'year': int.parse(_yearController.text.trim()),
      'price': double.parse(_priceController.text.trim()),
      'mileage': _mileageController.text.trim().isNotEmpty
          ? int.parse(_mileageController.text.trim())
          : null,
      'condition': _condition.name.replaceAll('_', ''),
      'status': _status.name,
      'description': _descriptionController.text.trim(),
      'photos': allPhotos,
      'specifications': {
        ..._vehicle!.specifications.toJson(),
        'make': _makeController.text.trim(),
        'model': _modelController.text.trim(),
        'year': int.parse(_yearController.text.trim()),
        'mileage': _mileageController.text.trim().isNotEmpty
            ? int.parse(_mileageController.text.trim())
            : null,
      },
    };

    final success = await inventoryProvider.updateVehicle(_vehicle!.id, updates);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehículo actualizado exitosamente')),
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
    if (_vehicle == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final path = GoRouterState.of(context).uri.path;
    final drawer = path.startsWith('/dealer/')
        ? const DealerDrawer()
        : path.startsWith('/seller/')
            ? const SellerDrawer()
            : null;
    return Scaffold(
      drawer: drawer,
      appBar: AppBar(
        title: const Text('Editar Vehículo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _handleSave,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Fotos existentes
              if (_existingPhotos.isNotEmpty) ...[
                const Text(
                  'Fotos Actuales',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 150,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _existingPhotos.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Stack(
                          children: [
                            Image.network(
                              _existingPhotos[index],
                              width: 150,
                              fit: BoxFit.cover,
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: IconButton(
                                icon: const Icon(Icons.close, color: Colors.red),
                                onPressed: () => _removeExistingPhoto(_existingPhotos[index]),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
              // Nuevas fotos
              if (_newPhotos.isNotEmpty) ...[
                const Text(
                  'Nuevas Fotos',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 150,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _newPhotos.length,
                    itemBuilder: (context, index) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: Stack(
                          children: [
                            Image.file(
                              _newPhotos[index],
                              width: 150,
                              fit: BoxFit.cover,
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: IconButton(
                                icon: const Icon(Icons.close, color: Colors.red),
                                onPressed: () => _removeNewPhoto(_newPhotos[index]),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
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
              DropdownButtonFormField<VehicleStatus>(
                initialValue: _status,
                decoration: const InputDecoration(
                  labelText: 'Estado *',
                  border: OutlineInputBorder(),
                ),
                items: VehicleStatus.values.map((status) {
                  return DropdownMenuItem(
                    value: status,
                    child: Text(status.name),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _status = value;
                    });
                  }
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
                    onPressed: inventoryProvider.isLoading ? null : _handleSave,
                    child: inventoryProvider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Guardar Cambios'),
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


