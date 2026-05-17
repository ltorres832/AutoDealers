// Página de Inventario del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/data/services/firestore_service.dart';
import '../../../core/domain/models/vehicle.dart';
import '../widgets/seller_drawer.dart';

class SellerInventoryPage extends StatefulWidget {
  const SellerInventoryPage({super.key});

  @override
  State<SellerInventoryPage> createState() => _SellerInventoryPageState();
}

class _SellerInventoryPageState extends State<SellerInventoryPage> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final authProvider = context.read<AuthProvider>();
      final inventoryProvider = context.read<InventoryProvider>();
      String? tenantId = authProvider.user?.tenantId;
      if (tenantId == null || tenantId.isEmpty) {
        tenantId = await FirestoreService().getCurrentTenantId();
      }
      if (tenantId != null && mounted) {
        inventoryProvider.initialize(tenantId);
      }
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
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Inventario'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/seller/inventory/create'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Búsqueda
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                labelText: 'Buscar vehículo',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
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

                var filteredVehicles = inventoryProvider.vehicles
                    .where((v) => v.status == VehicleStatus.available)
                    .toList();

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
                                '${vehicle.currency} ${vehicle.price.toStringAsFixed(2)}',
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                inventoryProvider.selectVehicle(vehicle);
                                context.push('/seller/inventory/${vehicle.id}');
                              },
                            ),
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
                        ),
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
}


