import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/inventory_service.dart';
import '../../../core/models/vehicle.dart';
import 'package:intl/intl.dart';

/// Página completa de Inventario con sincronización en tiempo real
class InventoryPageComplete extends StatefulWidget {
  const InventoryPageComplete({super.key});

  @override
  State<InventoryPageComplete> createState() => _InventoryPageCompleteState();
}

class _InventoryPageCompleteState extends State<InventoryPageComplete> {
  final InventoryService _inventoryService = InventoryService();
  String? _filterStatus;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventario'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateVehicleDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de búsqueda
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar vehículos...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value.toLowerCase());
              },
            ),
          ),

          // Filtros activos
          if (_filterStatus != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.blue.shade50,
              child: Row(
                children: [
                  Chip(
                    label: Text('Estado: $_filterStatus'),
                    onDeleted: () {
                      setState(() => _filterStatus = null);
                    },
                  ),
                ],
              ),
            ),

          // Lista de vehículos
          Expanded(
            child: StreamBuilder<List<Vehicle>>(
              stream: _inventoryService.watchVehicles(status: _filterStatus),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error: ${snapshot.error}'),
                  );
                }

                final vehicles = snapshot.data ?? [];
                final filteredVehicles = _searchQuery.isEmpty
                    ? vehicles
                    : vehicles.where((vehicle) {
                        return vehicle.displayName
                                .toLowerCase()
                                .contains(_searchQuery) ||
                            vehicle.make.toLowerCase().contains(_searchQuery) ||
                            vehicle.model.toLowerCase().contains(_searchQuery) ||
                            (vehicle.vin?.toLowerCase().contains(_searchQuery) ??
                                false) ||
                            (vehicle.plate?.toLowerCase().contains(_searchQuery) ??
                                false);
                      }).toList();

                if (filteredVehicles.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.directions_car_outlined,
                            size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          'No hay vehículos',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  );
                }

                return GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 0.75,
                  ),
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredVehicles.length,
                  itemBuilder: (context, index) {
                    final vehicle = filteredVehicles[index];
                    return _VehicleCard(
                      vehicle: vehicle,
                      onTap: () {
                        // TODO: Navegar a detalle de vehículo
                      },
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

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filtrar Vehículos'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Todos'),
              leading: Radio<String?>(
                value: null,
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Disponible'),
              leading: Radio<String?>(
                value: 'available',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Vendido'),
              leading: Radio<String?>(
                value: 'sold',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Reservado'),
              leading: Radio<String?>(
                value: 'reserved',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateVehicleDialog() {
    // TODO: Implementar modal de crear vehículo
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Agregar Vehículo'),
        content: const Text('Funcionalidad en desarrollo'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final Vehicle vehicle;
  final VoidCallback onTap;

  const _VehicleCard({
    required this.vehicle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Imagen
            Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                ),
                child: vehicle.photos.isNotEmpty
                    ? Image.network(
                        vehicle.photos.first,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(Icons.directions_car, size: 64),
                      )
                    : const Icon(Icons.directions_car, size: 64),
              ),
            ),
            // Información
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.displayName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '\$${NumberFormat('#,###').format(vehicle.price)}',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        _StatusChip(status: vehicle.status),
                        const Spacer(),
                        if (vehicle.color != null)
                          Icon(
                            Icons.circle,
                            size: 16,
                            color: _getColorFromString(vehicle.color!),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getColorFromString(String colorName) {
    // Mapeo básico de colores
    final colorMap = {
      'rojo': Colors.red,
      'azul': Colors.blue,
      'verde': Colors.green,
      'negro': Colors.black,
      'blanco': Colors.white,
      'gris': Colors.grey,
      'plateado': Colors.grey[400]!,
    };
    return colorMap[colorName.toLowerCase()] ?? Colors.grey;
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  Color get _statusColor {
    switch (status) {
      case 'available':
        return Colors.green;
      case 'sold':
        return Colors.red;
      case 'reserved':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String get _statusLabel {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'sold':
        return 'Vendido';
      case 'reserved':
        return 'Reservado';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _statusColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _statusLabel,
        style: TextStyle(
          color: _statusColor,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}


