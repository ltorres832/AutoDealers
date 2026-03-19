// Sección de Categorías de Vehículos - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/vehicle.dart';

class VehicleCategory {
  final String id;
  final String name;
  final String description;
  
  const VehicleCategory({
    required this.id,
    required this.name,
    required this.description,
  });
}

const List<VehicleCategory> vehicleCategories = [
  VehicleCategory(id: 'suv', name: 'SUV', description: 'Vehículos utilitarios deportivos'),
  VehicleCategory(id: 'sedan', name: 'Sedán', description: 'Elegancia y comodidad'),
  VehicleCategory(id: 'pickup-truck', name: 'Pickup Truck', description: 'Potencia y versatilidad'),
  VehicleCategory(id: 'coupe', name: 'Cupé', description: 'Estilo deportivo'),
  VehicleCategory(id: 'hatchback', name: 'Hatchback', description: 'Compacto y eficiente'),
  VehicleCategory(id: 'wagon', name: 'Wagon', description: 'Espacio y funcionalidad'),
  VehicleCategory(id: 'convertible', name: 'Convertible', description: 'Aire libre y estilo'),
  VehicleCategory(id: 'minivan', name: 'Minivan', description: 'Ideal para familias'),
  VehicleCategory(id: 'van', name: 'Van', description: 'Carga y transporte'),
  VehicleCategory(id: 'luxury', name: 'Lujo', description: 'Experiencia premium'),
  VehicleCategory(id: 'crossover', name: 'Crossover', description: 'Lo mejor de ambos mundos'),
  VehicleCategory(id: 'electric', name: 'Eléctricos', description: 'Tecnología sostenible'),
  VehicleCategory(id: 'hybrid', name: 'Híbridos', description: 'Eficiencia avanzada'),
  VehicleCategory(id: 'plug-in-hybrid', name: 'Plug-in Híbrido', description: 'Flexibilidad energética'),
];

class VehicleCategoriesSection extends StatelessWidget {
  const VehicleCategoriesSection({super.key});

  String _normalizeBodyType(VehicleBodyType bodyType) {
    // Convertir enum a string normalizado que coincida con los IDs de categorías
    switch (bodyType) {
      case VehicleBodyType.pickupTruck:
        return 'pickup-truck';
      case VehicleBodyType.plugInHybrid:
        return 'plug-in-hybrid';
      default:
        return bodyType.name;
    }
  }

  Map<String, int> _getVehicleCounts(List<Vehicle> vehicles) {
    final counts = <String, int>{};
    
    for (final vehicle in vehicles) {
      if (vehicle.status != VehicleStatus.available) continue;
      
      // Contar por bodyType (normalizado)
      if (vehicle.bodyType != null) {
        final bodyTypeStr = _normalizeBodyType(vehicle.bodyType!);
        counts[bodyTypeStr] = (counts[bodyTypeStr] ?? 0) + 1;
      }
      
      // También contar por fuelType si es eléctrico o híbrido (puede estar en bodyType o fuelType)
      if (vehicle.specifications.fuelType != null) {
        final fuelType = vehicle.specifications.fuelType!;
        if (fuelType == FuelType.electric) {
          counts['electric'] = (counts['electric'] ?? 0) + 1;
        } else if (fuelType == FuelType.hybrid) {
          counts['hybrid'] = (counts['hybrid'] ?? 0) + 1;
        } else if (fuelType == FuelType.plugInHybrid) {
          counts['hybrid'] = (counts['hybrid'] ?? 0) + 1;
          counts['plug-in-hybrid'] = (counts['plug-in-hybrid'] ?? 0) + 1;
        }
      }
      
      // Si el bodyType es eléctrico o híbrido, también contar ahí
      if (vehicle.bodyType == VehicleBodyType.electric) {
        counts['electric'] = (counts['electric'] ?? 0) + 1;
      } else if (vehicle.bodyType == VehicleBodyType.hybrid) {
        counts['hybrid'] = (counts['hybrid'] ?? 0) + 1;
      } else if (vehicle.bodyType == VehicleBodyType.plugInHybrid) {
        counts['hybrid'] = (counts['hybrid'] ?? 0) + 1;
        counts['plug-in-hybrid'] = (counts['plug-in-hybrid'] ?? 0) + 1;
      }
    }
    
    return counts;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InventoryProvider>(
      builder: (context, inventoryProvider, _) {
        final vehicles = inventoryProvider.vehicles
            .where((v) => v.status == VehicleStatus.available)
            .toList();
        final vehicleCounts = _getVehicleCounts(vehicles);
        
        return Container(
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey, width: 1)),
      ),
      child: Column(
        children: [
          const SizedBox(
            width: double.infinity,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Buscar por Tipo de Vehículo',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF111827), // gray-900
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Explora nuestra amplia selección organizada por categoría',
                    style: TextStyle(
                      fontSize: 18,
                      color: Color(0xFF4B5563), // gray-600
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 48),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 1024 
                  ? 7 
                  : constraints.maxWidth > 768 
                      ? 4 
                      : 2;
              
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.9,
                ),
                itemCount: vehicleCategories.length,
                itemBuilder: (context, index) {
                  final category = vehicleCategories[index];
                  final count = vehicleCounts[category.id] ?? 0;
                  
                  return _CategoryCard(
                    category: category,
                    count: count,
                    onTap: () {
                      context.go('/catalog?category=${category.id}');
                    },
                  );
                },
              );
            },
          ),
          const SizedBox(height: 40),
          TextButton.icon(
            onPressed: () => context.go('/catalog'),
            icon: const Icon(Icons.arrow_forward, size: 16),
            label: const Text(
              'Ver búsqueda avanzada',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.blue,
              ),
            ),
          ),
        ],
      ),
    );
      },
    );
  }
}

class _CategoryCard extends StatefulWidget {
  final VehicleCategory category;
  final int count;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.category,
    required this.count,
    required this.onTap,
  });

  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(
              color: _isHovered 
                  ? Color(0xFF3B82F6) // blue-500
                  : Color(0xFFE5E7EB), // gray-200
              width: 1,
            ),
            borderRadius: BorderRadius.circular(8),
            boxShadow: _isHovered
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          transform: Matrix4.identity()..translate(0.0, _isHovered ? -4.0 : 0.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                widget.category.name,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: _isHovered 
                      ? Color(0xFF2563EB) // blue-600
                      : Color(0xFF111827), // gray-900
                ),
              ),
              const SizedBox(height: 8),
              Text(
                widget.category.description,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7280), // gray-500
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: widget.count > 0 
                      ? Color(0xFFF3F4F6) // gray-100
                      : Color(0xFFF9FAFB), // gray-50
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  widget.count.toString(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: widget.count > 0 
                        ? Color(0xFF374151) // gray-700
                        : Color(0xFF9CA3AF), // gray-400
                  ),
                ),
              ),
              // Indicador de hover
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                height: 2,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: _isHovered 
                      ? Color(0xFF3B82F6) // blue-500
                      : Colors.transparent,
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(8),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


