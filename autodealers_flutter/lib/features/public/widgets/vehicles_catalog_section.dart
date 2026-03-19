// Catálogo Completo de Vehículos - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/api_config.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../providers/compare_provider.dart';
import '../../../core/domain/models/vehicle.dart';
import 'advanced_filters_widget.dart';
import 'vehicle_card.dart';
import 'sidebar_banner_widget.dart';

enum ViewMode { grid, list }
enum SortBy { priceAsc, priceDesc, yearDesc, mileageAsc }

class VehiclesCatalogSection extends StatefulWidget {
  final Map<String, String>? initialFilters;
  
  const VehiclesCatalogSection({
    super.key,
    this.initialFilters,
  });

  @override
  State<VehiclesCatalogSection> createState() => _VehiclesCatalogSectionState();
}

class _VehiclesCatalogSectionState extends State<VehiclesCatalogSection> {
  ViewMode _viewMode = ViewMode.grid;
  SortBy _sortBy = SortBy.priceAsc;
  final Set<String> _selectedVehicles = {};
  
  late Map<String, String> _filters;

  @override
  void initState() {
    super.initState();
    _filters = widget.initialFilters ?? {
      'make': 'all',
      'model': '',
      'yearMin': '',
      'yearMax': '',
      'priceMin': '',
      'priceMax': '',
      'mileageMax': '',
      'fuelType': 'all',
      'transmission': 'all',
      'condition': 'all',
      'location': '',
      'bodyType': 'all',
    };
  }

  List<Vehicle> _getFilteredVehicles(List<Vehicle> vehicles) {
    var filtered = List<Vehicle>.from(vehicles);

    // Aplicar filtros
    if (_filters['make'] != null && _filters['make'] != 'all') {
      filtered = filtered.where((v) => v.make == _filters['make']).toList();
    }

    if (_filters['model'] != null && _filters['model']!.isNotEmpty) {
      final modelLower = _filters['model']!.toLowerCase();
      filtered = filtered.where((v) => v.model.toLowerCase().contains(modelLower)).toList();
    }

    if (_filters['yearMin'] != null && _filters['yearMin']!.isNotEmpty) {
      final yearMin = int.tryParse(_filters['yearMin']!) ?? 0;
      filtered = filtered.where((v) => v.year >= yearMin).toList();
    }

    if (_filters['yearMax'] != null && _filters['yearMax']!.isNotEmpty) {
      final yearMax = int.tryParse(_filters['yearMax']!) ?? 9999;
      filtered = filtered.where((v) => v.year <= yearMax).toList();
    }

    if (_filters['priceMin'] != null && _filters['priceMin']!.isNotEmpty) {
      final priceMin = double.tryParse(_filters['priceMin']!) ?? 0;
      filtered = filtered.where((v) => v.price >= priceMin).toList();
    }

    if (_filters['priceMax'] != null && _filters['priceMax']!.isNotEmpty) {
      final priceMax = double.tryParse(_filters['priceMax']!) ?? double.infinity;
      filtered = filtered.where((v) => v.price <= priceMax).toList();
    }

    if (_filters['mileageMax'] != null && _filters['mileageMax']!.isNotEmpty) {
      final mileageMax = int.tryParse(_filters['mileageMax']!) ?? 999999;
      filtered = filtered.where((v) => v.mileage == null || v.mileage! <= mileageMax).toList();
    }

    if (_filters['bodyType'] != null && _filters['bodyType'] != 'all') {
      final want = _filters['bodyType']!.toLowerCase().replaceAll('_', '-');
      filtered = filtered.where((v) {
        final bt = v.bodyType?.name.replaceAll('_', '-').toLowerCase() ?? v.specifications.bodyType?.name.replaceAll('_', '-').toLowerCase() ?? '';
        return bt.isNotEmpty && bt == want;
      }).toList();
    }

    if (_filters['condition'] != null && _filters['condition'] != 'all') {
      filtered = filtered.where((v) => v.condition.name.replaceAll('_', '') == _filters['condition']).toList();
    }

    if (_filters['fuelType'] != null && _filters['fuelType'] != 'all') {
      filtered = filtered.where((v) => v.specifications.fuelType?.name.toLowerCase() == _filters['fuelType']!.toLowerCase()).toList();
    }

    if (_filters['transmission'] != null && _filters['transmission'] != 'all') {
      filtered = filtered.where((v) => v.specifications.transmission?.name.toLowerCase() == _filters['transmission']!.toLowerCase()).toList();
    }

    // Ordenar
    filtered.sort((a, b) {
      switch (_sortBy) {
        case SortBy.priceAsc:
          return a.price.compareTo(b.price);
        case SortBy.priceDesc:
          return b.price.compareTo(a.price);
        case SortBy.yearDesc:
          return b.year.compareTo(a.year);
        case SortBy.mileageAsc:
          return (a.mileage ?? 0).compareTo(b.mileage ?? 0);
      }
    });

    return filtered;
  }

  List<String> _getUniqueMakes(List<Vehicle> vehicles) {
    return vehicles.map((v) => v.make).toSet().toList()..sort();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InventoryProvider>(
      builder: (context, inventoryProvider, _) {
        final vehicles = inventoryProvider.vehicles
            .where((v) => v.status == VehicleStatus.available)
            .toList();
        
        final filteredVehicles = _getFilteredVehicles(vehicles);
        final uniqueMakes = _getUniqueMakes(vehicles);

        return Container(
          padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
          color: Colors.white,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sidebar
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.only(right: 32),
                  child: const StickyBox(
                    child: SidebarBannerWidget(),
                  ),
                ),
              ),
              
              // Contenido principal
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Catálogo Completo',
                            style: TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.w900,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                        Consumer<CompareProvider>(
                          builder: (context, compareProvider, _) {
                            if (compareProvider.count < 2) return const SizedBox.shrink();
                            return Padding(
                              padding: const EdgeInsets.only(left: 16),
                              child: ElevatedButton.icon(
                                onPressed: () => context.go('/compare?${compareProvider.queryParams}'),
                                icon: const Icon(Icons.compare_arrows),
                                label: Text('Comparar (${compareProvider.count})'),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${filteredVehicles.length} vehículos disponibles para ti',
                      style: const TextStyle(
                        fontSize: 20,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 48),
                    
                    // Controles de vista y ordenamiento
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          // Selector de ordenamiento
                          DropdownButton<SortBy>(
                            value: _sortBy,
                            items: const [
                              DropdownMenuItem(
                                value: SortBy.priceAsc,
                                child: Text('Precio: Menor a Mayor'),
                              ),
                              DropdownMenuItem(
                                value: SortBy.priceDesc,
                                child: Text('Precio: Mayor a Menor'),
                              ),
                              DropdownMenuItem(
                                value: SortBy.yearDesc,
                                child: Text('Año: Más Reciente'),
                              ),
                              DropdownMenuItem(
                                value: SortBy.mileageAsc,
                                child: Text('Millas: Menor a Mayor'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value != null) {
                                setState(() => _sortBy = value);
                              }
                            },
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey,
                            ),
                          ),
                          const Spacer(),
                          
                          // Botones de vista
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade300),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                _ViewModeButton(
                                  icon: Icons.grid_view,
                                  isSelected: _viewMode == ViewMode.grid,
                                  onTap: () => setState(() => _viewMode = ViewMode.grid),
                                ),
                                Container(
                                  width: 1,
                                  height: 40,
                                  color: Colors.grey.shade300,
                                ),
                                _ViewModeButton(
                                  icon: Icons.view_list,
                                  isSelected: _viewMode == ViewMode.list,
                                  onTap: () => setState(() => _viewMode = ViewMode.list),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Filtros avanzados
                    AdvancedFiltersWidget(
                      filters: _filters,
                      availableMakes: uniqueMakes,
                      onFiltersChange: (newFilters) {
                        setState(() => _filters = newFilters);
                      },
                    ),
                    const SizedBox(height: 32),
                    
                    // Comparador de vehículos
                    if (_selectedVehicles.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        margin: const EdgeInsets.only(bottom: 32),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          border: Border.all(color: Colors.grey.shade200),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${_selectedVehicles.length} vehículo(s) seleccionado(s)',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.grey,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Compara características y precios lado a lado',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            ElevatedButton(
                              onPressed: () {
                                final vehicleIdsParam = _selectedVehicles.join(',');
                                context.go('/compare?vehicles=$vehicleIdsParam');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.grey.shade900,
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              ),
                              child: const Text('Comparar Ahora'),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton(
                              onPressed: () => setState(() => _selectedVehicles.clear()),
                              child: const Text('Limpiar'),
                            ),
                          ],
                        ),
                      ),
                    
                    // Listado de vehículos
                    if (inventoryProvider.isLoading && vehicles.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(48.0),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (filteredVehicles.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(80),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.search,
                                size: 40,
                                color: Colors.grey.shade400,
                              ),
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'No se encontraron vehículos',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const SizedBox(
                              width: 400,
                              child: Text(
                                'Intenta ajustar los filtros de búsqueda para encontrar más resultados',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _filters = {
                                    'make': 'all',
                                    'model': '',
                                    'yearMin': '',
                                    'yearMax': '',
                                    'priceMin': '',
                                    'priceMax': '',
                                    'mileageMax': '',
                                    'fuelType': 'all',
                                    'transmission': 'all',
                                    'condition': 'all',
                                    'location': '',
                                    'bodyType': 'all',
                                  };
                                });
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.grey.shade900,
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              ),
                              child: const Text('Limpiar Filtros'),
                            ),
                          ],
                        ),
                      )
                    else ...[
                      Text(
                        'Mostrando ${filteredVehicles.length} de ${vehicles.length} vehículos disponibles',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 24),
                      _viewMode == ViewMode.grid
                          ? _buildGridView(filteredVehicles)
                          : _buildListView(filteredVehicles),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGridView(List<Vehicle> vehicles) {
    return LayoutBuilder(
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
          itemBuilder: (context, index) {
            final vehicle = vehicles[index];
            return Stack(
              children: [
                VehicleCard(vehicle: vehicle),
                // Checkbox para comparar
                Positioned(
                  top: 12,
                  left: 12,
                  child: Checkbox(
                    value: _selectedVehicles.contains(vehicle.id),
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          if (_selectedVehicles.length < 3) {
                            _selectedVehicles.add(vehicle.id);
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Solo puedes comparar hasta 3 vehículos')),
                            );
                          }
                        } else {
                          _selectedVehicles.remove(vehicle.id);
                        }
                      });
                    },
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildListView(List<Vehicle> vehicles) {
    return Column(
      children: vehicles.map((vehicle) {
        return Container(
          margin: const EdgeInsets.only(bottom: 24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade100),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Imagen
              Container(
                width: 320,
                height: 224,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                ),
                child: vehicle.photos.isNotEmpty
                    ? ClipRRect(
                        borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                        child: Image.network(
                          vehicle.photos.first.trim(),
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => const Center(
                            child: Text('🚗', style: TextStyle(fontSize: 64)),
                          ),
                        ),
                      )
                    : const Center(
                        child: Text('🚗', style: TextStyle(fontSize: 64, color: Colors.grey)),
                      ),
              ),
              
              // Información
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${vehicle.year} ${vehicle.make} ${vehicle.model}',
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '\$${vehicle.price.toStringAsFixed(0)}',
                                  style: TextStyle(
                                    fontSize: 36,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.green.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (vehicle.stockNumber != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '#${vehicle.stockNumber}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue.shade800,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          if (vehicle.mileage != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '📏 ${vehicle.mileage!.toStringAsFixed(0)} millas',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                          if (vehicle.specifications.transmission != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '⚙️ ${vehicle.specifications.transmission!.name}',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                          if (vehicle.specifications.fuelType != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '⛽ ${vehicle.specifications.fuelType!.name}',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        vehicle.description,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                context.go('/catalog/${vehicle.id}?tenantId=${Uri.encodeComponent(vehicle.tenantId)}');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.grey.shade900,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: const Text('Ver Detalles'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton(
                            onPressed: () {
                              final url = Uri.parse(
                                'https://wa.me/${kContactWhatsApp}?text=${Uri.encodeComponent('Hola, me interesa el vehículo ${vehicle.year} ${vehicle.make} ${vehicle.model}')}',
                              );
                              launchUrl(url);
                            },
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            ),
                            child: const Text('Contactar'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _ViewModeButton extends StatelessWidget {
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _ViewModeButton({
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        color: isSelected ? Colors.grey.shade900 : Colors.white,
        child: Icon(
          icon,
          color: isSelected ? Colors.white : Colors.grey.shade700,
          size: 20,
        ),
      ),
    );
  }
}

class StickyBox extends StatelessWidget {
  final Widget child;

  const StickyBox({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return child; // En Flutter web, el sticky se maneja con CustomScrollView y SliverAppBar
  }
}


