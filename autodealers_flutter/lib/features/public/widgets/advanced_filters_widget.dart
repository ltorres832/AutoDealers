// Filtros Avanzados - Replica exacta de Next.js
import 'package:flutter/material.dart';

class AdvancedFiltersWidget extends StatefulWidget {
  final Map<String, String> filters;
  final List<String> availableMakes;
  final Function(Map<String, String>) onFiltersChange;

  const AdvancedFiltersWidget({
    super.key,
    required this.filters,
    required this.availableMakes,
    required this.onFiltersChange,
  });

  @override
  State<AdvancedFiltersWidget> createState() => _AdvancedFiltersWidgetState();
}

class _AdvancedFiltersWidgetState extends State<AdvancedFiltersWidget> {
  bool _isExpanded = false;

  bool get _hasActiveFilters {
    return widget.filters['make'] != 'all' ||
        widget.filters['model']!.isNotEmpty ||
        widget.filters['yearMin']!.isNotEmpty ||
        widget.filters['yearMax']!.isNotEmpty ||
        widget.filters['priceMin']!.isNotEmpty ||
        widget.filters['priceMax']!.isNotEmpty ||
        widget.filters['mileageMax']!.isNotEmpty ||
        widget.filters['fuelType'] != 'all' ||
        widget.filters['transmission'] != 'all' ||
        widget.filters['condition'] != 'all' ||
        widget.filters['location']!.isNotEmpty ||
        widget.filters['bodyType'] != 'all';
  }

  void _updateFilter(String key, String value) {
    final newFilters = Map<String, String>.from(widget.filters);
    newFilters[key] = value;
    widget.onFiltersChange(newFilters);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: _isExpanded
              ? [Colors.blue.shade50, Colors.indigo.shade50]
              : [Colors.white, Colors.grey.shade50],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _hasActiveFilters ? Colors.blue.shade400 : Colors.grey.shade200,
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _isExpanded ? Colors.blue.shade600 : Colors.grey.shade200,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.tune,
                      color: _isExpanded ? Colors.white : Colors.grey.shade600,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Búsqueda Avanzada',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey,
                        ),
                      ),
                      if (_hasActiveFilters)
                        const Text(
                          'Filtros activos',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.blue,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: () => setState(() => _isExpanded = !_isExpanded),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isExpanded
                      ? Colors.grey.shade200
                      : Colors.blue.shade600,
                  foregroundColor: _isExpanded
                      ? Colors.grey.shade700
                      : Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: Text(_isExpanded ? 'Ocultar Filtros' : 'Ver Búsqueda Avanzada'),
              ),
            ],
          ),
          if (_isExpanded) ...[
            const SizedBox(height: 24),
            LayoutBuilder(
              builder: (context, constraints) {
                final crossAxisCount = constraints.maxWidth > 1024 
                    ? 4 
                    : constraints.maxWidth > 768 
                        ? 2 
                        : 1;
                
                return GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: crossAxisCount,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 3,
                  children: [
                    // Marca
                    _FilterField(
                      label: 'Marca',
                      child: DropdownButton<String>(
                        value: widget.filters['make'] ?? 'all',
                        isExpanded: true,
                        items: [
                          const DropdownMenuItem(value: 'all', child: Text('Todas')),
                          ...widget.availableMakes.map((make) => DropdownMenuItem(
                                value: make,
                                child: Text(make),
                              )),
                        ],
                        onChanged: (value) => _updateFilter('make', value ?? 'all'),
                      ),
                    ),
                    
                    // Modelo
                    _FilterField(
                      label: 'Modelo',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: 'Ej: Civic',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        onChanged: (value) => _updateFilter('model', value),
                      ),
                    ),
                    
                    // Año Mínimo
                    _FilterField(
                      label: 'Año Mínimo',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: '2020',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => _updateFilter('yearMin', value),
                      ),
                    ),
                    
                    // Año Máximo
                    _FilterField(
                      label: 'Año Máximo',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: '2024',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => _updateFilter('yearMax', value),
                      ),
                    ),
                    
                    // Precio Mínimo
                    _FilterField(
                      label: 'Precio Mínimo',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: '\$10,000',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => _updateFilter('priceMin', value),
                      ),
                    ),
                    
                    // Precio Máximo
                    _FilterField(
                      label: 'Precio Máximo',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: '\$50,000',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => _updateFilter('priceMax', value),
                      ),
                    ),
                    
                    // Millas Máximas
                    _FilterField(
                      label: 'Millas Máximas',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: '100,000',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) => _updateFilter('mileageMax', value),
                      ),
                    ),
                    
                    // Tipo de Combustible
                    _FilterField(
                      label: 'Combustible',
                      child: DropdownButton<String>(
                        value: widget.filters['fuelType'] ?? 'all',
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Todos')),
                          DropdownMenuItem(value: 'gasoline', child: Text('Gasolina')),
                          DropdownMenuItem(value: 'diesel', child: Text('Diésel')),
                          DropdownMenuItem(value: 'electric', child: Text('Eléctrico')),
                          DropdownMenuItem(value: 'hybrid', child: Text('Híbrido')),
                        ],
                        onChanged: (value) => _updateFilter('fuelType', value ?? 'all'),
                      ),
                    ),
                    
                    // Transmisión
                    _FilterField(
                      label: 'Transmisión',
                      child: DropdownButton<String>(
                        value: widget.filters['transmission'] ?? 'all',
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Todas')),
                          DropdownMenuItem(value: 'automatic', child: Text('Automática')),
                          DropdownMenuItem(value: 'manual', child: Text('Manual')),
                          DropdownMenuItem(value: 'cvt', child: Text('CVT')),
                        ],
                        onChanged: (value) => _updateFilter('transmission', value ?? 'all'),
                      ),
                    ),
                    
                    // Condición
                    _FilterField(
                      label: 'Condición',
                      child: DropdownButton<String>(
                        value: widget.filters['condition'] ?? 'all',
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Todas')),
                          DropdownMenuItem(value: 'new', child: Text('Nuevo')),
                          DropdownMenuItem(value: 'used', child: Text('Usado')),
                          DropdownMenuItem(value: 'certified', child: Text('Certificado')),
                        ],
                        onChanged: (value) => _updateFilter('condition', value ?? 'all'),
                      ),
                    ),
                    
                    // Ubicación
                    _FilterField(
                      label: 'Ubicación',
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: 'Ciudad, Estado',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        onChanged: (value) => _updateFilter('location', value),
                      ),
                    ),
                    
                    // Tipo de Vehículo
                    _FilterField(
                      label: 'Tipo de Vehículo',
                      child: DropdownButton<String>(
                        value: widget.filters['bodyType'] ?? 'all',
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(value: 'all', child: Text('Todos')),
                          DropdownMenuItem(value: 'suv', child: Text('SUV')),
                          DropdownMenuItem(value: 'sedan', child: Text('Sedán')),
                          DropdownMenuItem(value: 'pickup-truck', child: Text('Pickup Truck')),
                          DropdownMenuItem(value: 'coupe', child: Text('Cupé')),
                          DropdownMenuItem(value: 'hatchback', child: Text('Hatchback')),
                          DropdownMenuItem(value: 'wagon', child: Text('Wagon')),
                          DropdownMenuItem(value: 'convertible', child: Text('Convertible')),
                          DropdownMenuItem(value: 'minivan', child: Text('Minivan')),
                          DropdownMenuItem(value: 'van', child: Text('Van')),
                          DropdownMenuItem(value: 'luxury', child: Text('Lujo')),
                          DropdownMenuItem(value: 'crossover', child: Text('Crossover')),
                          DropdownMenuItem(value: 'electric', child: Text('Eléctricos')),
                          DropdownMenuItem(value: 'hybrid', child: Text('Híbridos')),
                        ],
                        onChanged: (value) => _updateFilter('bodyType', value ?? 'all'),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterField extends StatelessWidget {
  final String label;
  final Widget child;

  const _FilterField({
    required this.label,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}


