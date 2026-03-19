// Página de Comparación de Vehículos - Carga por ID+tenant desde URL (como Next.js)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/data/repositories/inventory_repository.dart';
import '../../../core/domain/models/vehicle.dart';

class CompareVehiclesPage extends StatefulWidget {
  final List<String> vehicleIds;

  const CompareVehiclesPage({
    super.key,
    required this.vehicleIds,
  });

  @override
  State<CompareVehiclesPage> createState() => _CompareVehiclesPageState();
}

class _CompareVehiclesPageState extends State<CompareVehiclesPage> {
  final InventoryRepository _repo = InventoryRepository();
  List<Vehicle> _vehicles = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  @override
  void didUpdateWidget(CompareVehiclesPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.vehicleIds != widget.vehicleIds) _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    if (widget.vehicleIds.isEmpty) {
      if (mounted) context.go('/');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    final uri = GoRouterState.of(context).uri;
    final tenantsParam = uri.queryParameters['tenants'];
    final singleTenant = uri.queryParameters['tenantId'];
    final tenantIds = tenantsParam != null && tenantsParam.isNotEmpty
        ? tenantsParam.split(',')
        : List.filled(widget.vehicleIds.length, singleTenant ?? '');
    final loaded = <Vehicle>[];
    for (var i = 0; i < widget.vehicleIds.length; i++) {
      final id = widget.vehicleIds[i];
      final tenantId = i < tenantIds.length ? tenantIds[i].trim() : (singleTenant ?? '');
      if (tenantId.isEmpty) continue;
      try {
        final v = await _repo.getVehicle(id, tenantId: tenantId);
        if (v != null) loaded.add(v);
      } catch (_) {}
    }
    if (mounted) {
      setState(() {
        _vehicles = loaded;
        _loading = false;
        if (loaded.isEmpty && widget.vehicleIds.isNotEmpty) _error = 'No se pudieron cargar los vehículos';
      });
      if (loaded.isEmpty && widget.vehicleIds.isNotEmpty && _error != null) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) context.go('/catalog');
        });
      }
    }
  }

  void _removeVehicle(int index) {
    final newIds = List<String>.from(widget.vehicleIds)..removeAt(index);
    final uri = GoRouterState.of(context).uri;
    final tenantsParam = uri.queryParameters['tenants'];
    final singleTenant = uri.queryParameters['tenantId'];
    List<String> newTenants = [];
    if (tenantsParam != null && tenantsParam.isNotEmpty) {
      newTenants = tenantsParam.split(',')..removeAt(index);
    }
    if (newIds.isEmpty) {
      context.go('/');
      return;
    }
    final q = <String, String>{
      'vehicles': newIds.join(','),
    };
    if (newTenants.isNotEmpty) {
      q['tenants'] = newTenants.join(',');
    } else if (singleTenant != null) {
      q['tenantId'] = singleTenant;
    }
    context.go('/compare?${q.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}');
  }

  @override
  Widget build(BuildContext context) {
    if (widget.vehicleIds.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Comparar Vehículos')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null || _vehicles.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Comparar Vehículos'),
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/catalog')),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'No hay vehículos para comparar', style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => context.go('/catalog'), child: const Text('Ir al catálogo')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Comparar Vehículos'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/catalog'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadVehicles,
          ),
        ],
      ),
      body: SelectionArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Comparación de Vehículos',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Compara ${_vehicles.length} vehículo(s) lado a lado',
                style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 32),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columnSpacing: 24,
                  columns: [
                    const DataColumn(label: Text('Característica')),
                    ..._vehicles.asMap().entries.map((e) => DataColumn(
                          label: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('${e.value.year} ${e.value.make} ${e.value.model}'),
                              IconButton(
                                icon: const Icon(Icons.close, size: 18),
                                onPressed: () => _removeVehicle(e.key),
                                tooltip: 'Quitar de la comparación',
                              ),
                            ],
                          ),
                        )),
                  ],
                  rows: [
                    DataRow(
                      cells: [
                        const DataCell(Text('Precio')),
                        ..._vehicles.map((v) => DataCell(
                              Text('\$${v.price.toStringAsFixed(0)}', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade600)),
                            )),
                      ],
                    ),
                    DataRow(
                      cells: [
                        const DataCell(Text('Año')),
                        ..._vehicles.map((v) => DataCell(Text(v.year.toString()))),
                      ],
                    ),
                    DataRow(
                      cells: [
                        const DataCell(Text('Millas')),
                        ..._vehicles.map((v) => DataCell(Text(v.mileage?.toString() ?? 'N/A'))),
                      ],
                    ),
                    DataRow(
                      cells: [
                        const DataCell(Text('Transmisión')),
                        ..._vehicles.map((v) => DataCell(Text(v.specifications.transmission?.name ?? 'N/A'))),
                      ],
                    ),
                    DataRow(
                      cells: [
                        const DataCell(Text('Combustible')),
                        ..._vehicles.map((v) => DataCell(Text(v.specifications.fuelType?.name ?? 'N/A'))),
                      ],
                    ),
                    DataRow(
                      cells: [
                        const DataCell(Text('Condición')),
                        ..._vehicles.map((v) => DataCell(Text(v.condition.name))),
                      ],
                    ),
                    DataRow(
                      cells: [
                        const DataCell(Text('Descripción')),
                        ..._vehicles.map((v) => DataCell(
                              SizedBox(
                                width: 200,
                                child: Text(v.description, maxLines: 3, overflow: TextOverflow.ellipsis),
                              ),
                            )),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Wrap(
                spacing: 16,
                children: _vehicles.map((vehicle) {
                  return ElevatedButton.icon(
                    onPressed: () => context.go('/catalog/${vehicle.id}?tenantId=${Uri.encodeComponent(vehicle.tenantId)}'),
                    icon: const Icon(Icons.visibility),
                    label: Text('Ver ${vehicle.make} ${vehicle.model}'),
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

