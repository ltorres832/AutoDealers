// Widget de búsqueda del Hero - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/search_parser.dart';

class HeroSearchWidget extends StatefulWidget {
  const HeroSearchWidget({super.key});

  @override
  State<HeroSearchWidget> createState() => _HeroSearchWidgetState();
}

class _HeroSearchWidgetState extends State<HeroSearchWidget> {
  final TextEditingController _searchController = TextEditingController();
  
  final List<String> _exampleQueries = [
    'Toyota RAV4 2020-2023',
    'Honda CR-V con menos de 50k millas',
    'Ford F-150 4x4 bajo \$35,000',
    'Tesla Model 3 usado',
    'BMW X5 2019-2022',
    'Nissan Altima 2021-2023',
    'Chevrolet Silverado 1500',
    'Jeep Wrangler 4 puertas',
    'Hyundai Tucson híbrido',
    'Mazda CX-5 2020-2023',
    'Audi Q5 usado certificado',
    'Mercedes-Benz C-Class 2020+',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearch([String? query]) {
    final searchQuery = query ?? _searchController.text.trim();
    if (searchQuery.isNotEmpty) {
      // Parsear la búsqueda y navegar con filtros
      final parsed = SearchParser.parse(searchQuery);
      final filters = parsed.toFilters();
      
      // Construir URL con filtros
      final queryParams = <String, String>{};
      if (parsed.make != null) queryParams['make'] = parsed.make!;
      if (parsed.model != null) queryParams['model'] = parsed.model!;
      if (parsed.yearMin != null) queryParams['yearMin'] = parsed.yearMin.toString();
      if (parsed.yearMax != null) queryParams['yearMax'] = parsed.yearMax.toString();
      if (parsed.priceMax != null) queryParams['priceMax'] = parsed.priceMax.toString();
      if (parsed.mileageMax != null) queryParams['mileageMax'] = parsed.mileageMax.toString();
      if (parsed.fuelType != null) queryParams['fuelType'] = parsed.fuelType!;
      if (parsed.transmission != null) queryParams['transmission'] = parsed.transmission!;
      if (parsed.condition != null) queryParams['condition'] = parsed.condition!;
      if (parsed.bodyType != null) queryParams['bodyType'] = parsed.bodyType!;
      
      // También incluir la búsqueda raw para búsqueda de texto libre
      queryParams['search'] = searchQuery;
      
      final queryString = queryParams.entries
          .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
          .join('&');
      
      // Scroll a la sección de vehículos después de navegar
      context.go('/catalog?$queryString');
      
      // Scroll suave a la sección de vehículos
      Future.delayed(const Duration(milliseconds: 300), () {
        // Esto se manejará en la página del catálogo
      });
    } else {
      context.go('/catalog');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Busca por marca, modelo, año, precio o características específicas...',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () => _searchController.clear(),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300, width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.blue, width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          ),
          onSubmitted: (_) => _handleSearch(),
        ),
        const SizedBox(height: 16),
        // Búsquedas populares
        Row(
          children: [
            Icon(Icons.bolt, size: 16, color: Colors.grey.shade700),
            const SizedBox(width: 8),
            Text(
              'Búsquedas populares:',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _exampleQueries.map((query) {
            return InkWell(
              onTap: () => _handleSearch(query),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade50, Colors.indigo.shade50],
                  ),
                  border: Border.all(color: Colors.blue.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.search, size: 16, color: Colors.blue.shade700),
                    const SizedBox(width: 8),
                    Text(
                      query,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey.shade800,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.info_outline, size: 14, color: Colors.grey.shade500),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                'Tip: También puedes buscar por características como "4x4", "híbrido", "certificado", "menos de X millas", etc.',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade500,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _handleSearch,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade900,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Buscar Vehículos',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }
}


