// Página de Lista de Vehículos
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/vehicle.dart';

class VehiclesListPage extends StatefulWidget {
  const VehiclesListPage({super.key});

  @override
  State<VehiclesListPage> createState() => _VehiclesListPageState();
}

class _VehiclesListPageState extends State<VehiclesListPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final inventoryProvider = context.read<InventoryProvider>();
      if (authProvider.user?.tenantId != null) {
        inventoryProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventario'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/vehicles/create'),
          ),
        ],
      ),
      body: Consumer<InventoryProvider>(
        builder: (context, inventoryProvider, _) {
          if (inventoryProvider.isLoading && inventoryProvider.vehicles.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (inventoryProvider.error != null) {
            return Center(
              child: Text('Error: ${inventoryProvider.error}'),
            );
          }

          if (inventoryProvider.vehicles.isEmpty) {
            return const Center(
              child: Text('No hay vehículos disponibles'),
            );
          }

          return ListView.builder(
            itemCount: inventoryProvider.vehicles.length,
            itemBuilder: (context, index) {
              final vehicle = inventoryProvider.vehicles[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
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
                      if (vehicle.status == VehicleStatus.available) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => context.push(
                                  '/appointments/create?vehicleId=${Uri.encodeComponent(vehicle.id)}&type=consultation',
                                ),
                                icon: const Icon(Icons.event, size: 18),
                                label: const Text('Cita'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => context.push(
                                  '/appointments/create?vehicleId=${Uri.encodeComponent(vehicle.id)}&type=test_drive',
                                ),
                                icon: const Icon(Icons.directions_car, size: 18),
                                label: const Text('Prueba'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
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


