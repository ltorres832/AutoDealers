// Página de Todos los Vehículos (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/vehicle.dart';

class AdminAllVehiclesPage extends StatefulWidget {
  const AdminAllVehiclesPage({super.key});

  @override
  State<AdminAllVehiclesPage> createState() => _AdminAllVehiclesPageState();
}

class _AdminAllVehiclesPageState extends State<AdminAllVehiclesPage> {
  String _statusFilter = '';
  String _makeFilter = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InventoryProvider>().loadVehicles();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Todos los Vehículos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/vehicles/create'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Buscar',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _statusFilter.isEmpty ? null : _statusFilter,
                        decoration: const InputDecoration(
                          labelText: 'Estado',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'available', child: Text('Disponible')),
                          DropdownMenuItem(value: 'reserved', child: Text('Reservado')),
                          DropdownMenuItem(value: 'sold', child: Text('Vendido')),
                        ],
                        onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        decoration: const InputDecoration(
                          labelText: 'Marca',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => setState(() => _makeFilter = value),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Lista de vehículos
          Expanded(
            child: Consumer<InventoryProvider>(
              builder: (context, inventoryProvider, _) {
                if (inventoryProvider.isLoading && inventoryProvider.vehicles.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (inventoryProvider.error != null) {
                  return Center(
                    child: Text('Error: ${inventoryProvider.error}'),
                  );
                }

                var filteredVehicles = inventoryProvider.vehicles;
                if (_statusFilter.isNotEmpty) {
                  filteredVehicles = filteredVehicles.where((vehicle) {
                    return vehicle.status.name == _statusFilter;
                  }).toList();
                }

                if (_makeFilter.isNotEmpty) {
                  filteredVehicles = filteredVehicles.where((vehicle) {
                    return vehicle.make.toLowerCase().contains(_makeFilter.toLowerCase());
                  }).toList();
                }

                if (_searchController.text.isNotEmpty) {
                  final searchLower = _searchController.text.toLowerCase();
                  filteredVehicles = filteredVehicles.where((vehicle) {
                    return '${vehicle.year} ${vehicle.make} ${vehicle.model}'.toLowerCase().contains(searchLower);
                  }).toList();
                }

                if (filteredVehicles.isEmpty) {
                  return const Center(
                    child: Text('No hay vehículos disponibles'),
                  );
                }

                return ListView.builder(
                  itemCount: filteredVehicles.length,
                  itemBuilder: (context, index) {
                    final vehicle = filteredVehicles[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: vehicle.photos.isNotEmpty
                            ? Image.network(
                                vehicle.photos.first,
                                width: 60,
                                height: 60,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return const Icon(Icons.directions_car, size: 60);
                                },
                              )
                            : const Icon(Icons.directions_car, size: 60),
                        title: Text('${vehicle.year} ${vehicle.make} ${vehicle.model}'),
                        subtitle: Text(
                          '${vehicle.currency} ${vehicle.price.toStringAsFixed(2)} • ${vehicle.status.name}',
                        ),
                        trailing: Icon(_getStatusIcon(vehicle.status)),
                        onTap: () {
                          inventoryProvider.selectVehicle(vehicle);
                          context.push('/vehicles/${vehicle.id}');
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  IconData _getStatusIcon(VehicleStatus status) {
    switch (status) {
      case VehicleStatus.available:
        return Icons.check_circle;
      case VehicleStatus.reserved:
        return Icons.schedule;
      case VehicleStatus.sold:
        return Icons.done;
    }
  }
}


