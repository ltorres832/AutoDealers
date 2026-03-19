// Página de Detalle de Vehículo
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/vehicle.dart';
import '../../dealer/widgets/dealer_drawer.dart';
import '../../seller/widgets/seller_drawer.dart';

class VehicleDetailPage extends StatelessWidget {
  final String vehicleId;

  const VehicleDetailPage({super.key, required this.vehicleId});

  static String _editPath(BuildContext context, String vehicleId) {
    final path = GoRouterState.of(context).uri.path;
    if (path.startsWith('/dealer/')) return '/dealer/inventory/$vehicleId/edit';
    if (path.startsWith('/seller/')) return '/seller/inventory/$vehicleId/edit';
    return '/vehicles/$vehicleId/edit';
  }

  @override
  Widget build(BuildContext context) {
    final inventoryProvider = context.watch<InventoryProvider>();
    final vehicle = inventoryProvider.vehicles.firstWhere(
      (v) => v.id == vehicleId,
      orElse: () => inventoryProvider.selectedVehicle!,
    );
    final path = GoRouterState.of(context).uri.path;
    final drawer = path.startsWith('/dealer/')
        ? const DealerDrawer()
        : path.startsWith('/seller/')
            ? const SellerDrawer()
            : null;

    return Scaffold(
      drawer: drawer,
      appBar: AppBar(
        title: Text('${vehicle.year} ${vehicle.make} ${vehicle.model}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.push(_editPath(context, vehicle.id)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Galería de fotos
            if (vehicle.photos.isNotEmpty)
              SizedBox(
                height: 300,
                child: PageView.builder(
                  itemCount: vehicle.photos.length,
                  itemBuilder: (context, index) {
                    return CachedNetworkImage(
                      imageUrl: vehicle.photos[index],
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const Center(
                        child: CircularProgressIndicator(),
                      ),
                      errorWidget: (context, url, error) => const Icon(Icons.error),
                    );
                  },
                ),
              )
            else
              Container(
                height: 300,
                color: Colors.grey[300],
                child: const Center(
                  child: Icon(Icons.directions_car, size: 100),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Precio y estado
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${vehicle.currency} ${vehicle.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Chip(
                        label: Text(vehicle.status.name),
                        backgroundColor: _getStatusColor(vehicle.status),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Información básica
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Información Básica',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          _InfoRow(label: 'Año', value: vehicle.year.toString()),
                          _InfoRow(label: 'Marca', value: vehicle.make),
                          _InfoRow(label: 'Modelo', value: vehicle.model),
                          _InfoRow(label: 'Condición', value: vehicle.condition.name),
                          if (vehicle.mileage != null)
                            _InfoRow(label: 'Kilometraje', value: '${vehicle.mileage} km'),
                          if (vehicle.vin != null)
                            _InfoRow(label: 'VIN', value: vehicle.vin!),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Especificaciones
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Especificaciones',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          if (vehicle.specifications.color != null)
                            _InfoRow(
                              label: 'Color',
                              value: vehicle.specifications.color!,
                            ),
                          if (vehicle.specifications.transmission != null)
                            _InfoRow(
                              label: 'Transmisión',
                              value: vehicle.specifications.transmission!.name,
                            ),
                          if (vehicle.specifications.fuelType != null)
                            _InfoRow(
                              label: 'Combustible',
                              value: vehicle.specifications.fuelType!.name,
                            ),
                          if (vehicle.specifications.engine != null)
                            _InfoRow(
                              label: 'Motor',
                              value: vehicle.specifications.engine!,
                            ),
                          if (vehicle.specifications.doors != null)
                            _InfoRow(
                              label: 'Puertas',
                              value: vehicle.specifications.doors!.toString(),
                            ),
                          if (vehicle.specifications.seats != null)
                            _InfoRow(
                              label: 'Asientos',
                              value: vehicle.specifications.seats!.toString(),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Descripción
                  if (vehicle.description.isNotEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Descripción',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(vehicle.description),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  // Acciones
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            inventoryProvider.markAsSold(vehicle.id);
                          },
                          icon: const Icon(Icons.check),
                          label: const Text('Marcar como Vendido'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            inventoryProvider.togglePublicPage(
                              vehicle.id,
                              !(vehicle.publishedOnPublicPage ?? false),
                            );
                          },
                          icon: Icon(
                            vehicle.publishedOnPublicPage ?? false
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                          label: Text(
                            vehicle.publishedOnPublicPage ?? false
                                ? 'Ocultar'
                                : 'Publicar',
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(VehicleStatus status) {
    switch (status) {
      case VehicleStatus.available:
        return Colors.green;
      case VehicleStatus.reserved:
        return Colors.orange;
      case VehicleStatus.sold:
        return Colors.grey;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}


