// Sección de Vehículos Destacados
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/vehicle.dart';
import 'vehicle_card.dart';

class FeaturedVehiclesSection extends StatelessWidget {
  const FeaturedVehiclesSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<InventoryProvider>(
      builder: (context, inventoryProvider, _) {
        final vehicles = inventoryProvider.vehicles
            .where((v) => v.status == VehicleStatus.available)
            .take(6)
            .toList();

        return Container(
          padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFFF9FAFB), // gray-50
                Colors.white,
                const Color(0xFFEFF6FF), // blue-50
              ],
            ),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE), // blue-100
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('✨'),
                    SizedBox(width: 8),
                    Text(
                      'NUEVO',
                      style: TextStyle(
                        color: Color(0xFF2563EB), // blue-600
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Recién Agregados',
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827), // gray-900
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Los vehículos más recientes en nuestro inventario',
                style: TextStyle(
                  fontSize: 20,
                  color: Color(0xFF4B5563), // gray-600
                ),
              ),
              const SizedBox(height: 48),
              if (inventoryProvider.error != null)
                Container(
                  padding: const EdgeInsets.all(48),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(color: Colors.red.shade200, width: 2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Error al cargar: ${inventoryProvider.error}',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.red.shade800),
                      ),
                      const SizedBox(height: 12),
                      TextButton.icon(
                        onPressed: () => inventoryProvider.loadVehicles(status: VehicleStatus.available),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Reintentar'),
                      ),
                    ],
                  ),
                )
              else if (inventoryProvider.isLoading)
                const Padding(
                  padding: EdgeInsets.all(48.0),
                  child: CircularProgressIndicator(),
                )
              else if (vehicles.isEmpty)
                Container(
                  padding: const EdgeInsets.all(48),
                  decoration: BoxDecoration(
                    color: Colors.yellow.shade50,
                    border: Border.all(color: Colors.yellow.shade200, width: 2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'No hay vehículos disponibles aún',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF92400E),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Se muestran cuando los concesionarios publiquen anuncios.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.amber.shade800,
                        ),
                      ),
                    ],
                  ),
                )
              else
                LayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount = constraints.maxWidth > 1024 
                        ? 3 
                        : constraints.maxWidth > 768 
                            ? 2 
                            : 1;
                    
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        crossAxisSpacing: 24,
                        mainAxisSpacing: 24,
                        childAspectRatio: 0.75,
                      ),
                      itemCount: vehicles.length,
                      itemBuilder: (context, index) => VehicleCard(vehicle: vehicles[index]),
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}


