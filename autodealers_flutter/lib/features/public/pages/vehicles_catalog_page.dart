// Catálogo de Vehículos Público - Con filtrado automático desde búsqueda
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/vehicle.dart';
import '../widgets/vehicles_catalog_section.dart';
import '../services/search_parser.dart';

class PublicVehiclesCatalogPage extends StatefulWidget {
  const PublicVehiclesCatalogPage({super.key});

  @override
  State<PublicVehiclesCatalogPage> createState() => _PublicVehiclesCatalogPageState();
}

class _PublicVehiclesCatalogPageState extends State<PublicVehiclesCatalogPage> {
  final ScrollController _scrollController = ScrollController();
  Map<String, String> _initialFilters = {};

  @override
  void initState() {
    super.initState();
    // Obtener parámetros de búsqueda de la URL
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final uri = GoRouterState.of(context).uri;
      final searchQuery = uri.queryParameters['search'];
      
      if (searchQuery != null && searchQuery.isNotEmpty) {
        // Parsear la búsqueda y aplicar filtros
        final parsed = SearchParser.parse(searchQuery);
        _initialFilters = parsed.toFilters();
      } else {
        // Aplicar filtros desde query parameters (category = bodyType como en Next.js /category/[id])
        final category = uri.queryParameters['category'];
        _initialFilters = {
          'make': uri.queryParameters['make'] ?? 'all',
          'model': uri.queryParameters['model'] ?? '',
          'yearMin': uri.queryParameters['yearMin'] ?? '',
          'yearMax': uri.queryParameters['yearMax'] ?? '',
          'priceMin': uri.queryParameters['priceMin'] ?? '',
          'priceMax': uri.queryParameters['priceMax'] ?? '',
          'mileageMax': uri.queryParameters['mileageMax'] ?? '',
          'fuelType': uri.queryParameters['fuelType'] ?? 'all',
          'transmission': uri.queryParameters['transmission'] ?? 'all',
          'condition': uri.queryParameters['condition'] ?? 'all',
          'location': uri.queryParameters['location'] ?? '',
          'bodyType': category ?? uri.queryParameters['bodyType'] ?? 'all',
        };
      }
      
      final dealerId = uri.queryParameters['dealerId'];
      final inventoryProvider = context.read<InventoryProvider>();
      inventoryProvider.loadVehicles(
        status: VehicleStatus.available,
        tenantIdFilter: dealerId,
      );
      
      // Scroll suave a la sección de vehículos después de un delay
      Future.delayed(const Duration(milliseconds: 500), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            200, // Altura aproximada del header
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeInOut,
          );
        }
      });
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SelectionArea(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Catálogo de Vehículos'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/'),
          ),
        ),
        body: CustomScrollView(
          controller: _scrollController,
          slivers: [
            SliverToBoxAdapter(
              child: VehiclesCatalogSectionWithFilters(
                initialFilters: _initialFilters,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Wrapper para VehiclesCatalogSection que acepta filtros iniciales
class VehiclesCatalogSectionWithFilters extends StatefulWidget {
  final Map<String, String> initialFilters;

  const VehiclesCatalogSectionWithFilters({
    super.key,
    required this.initialFilters,
  });

  @override
  State<VehiclesCatalogSectionWithFilters> createState() => _VehiclesCatalogSectionWithFiltersState();
}

class _VehiclesCatalogSectionWithFiltersState extends State<VehiclesCatalogSectionWithFilters> {
  @override
  Widget build(BuildContext context) {
    // Usar VehiclesCatalogSection pero con filtros iniciales
    // Necesitamos modificar VehiclesCatalogSection para aceptar filtros iniciales
    return VehiclesCatalogSection(initialFilters: widget.initialFilters);
  }
}


