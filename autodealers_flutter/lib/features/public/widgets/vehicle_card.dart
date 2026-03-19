// Tarjeta de Vehículo - Replica EXACTA de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../core/domain/models/vehicle.dart';
import '../providers/compare_provider.dart';

class VehicleCard extends StatefulWidget {
  final Vehicle vehicle;

  const VehicleCard({super.key, required this.vehicle});

  @override
  State<VehicleCard> createState() => _VehicleCardState();
}

class _VehicleCardState extends State<VehicleCard> {
  bool _isHovered = false;

  String _getConditionLabel(VehicleCondition condition) {
    switch (condition) {
      case VehicleCondition.new_:
        return 'Nuevo';
      case VehicleCondition.certified:
        return 'Certificado';
      case VehicleCondition.used:
        return 'Usado';
    }
  }

  Color _getConditionColor(VehicleCondition condition) {
    switch (condition) {
      case VehicleCondition.new_:
        return const Color(0xFF10B981); // green-500
      case VehicleCondition.certified:
        return const Color(0xFF3B82F6); // blue-500
      case VehicleCondition.used:
        return const Color(0xFF374151); // gray-700
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPhotos = widget.vehicle.photos.isNotEmpty;
    final firstPhoto = hasPhotos ? widget.vehicle.photos[0].trim() : null;
    final photoCount = widget.vehicle.photos.length;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: () {
          context.go('/catalog/${widget.vehicle.id}?tenantId=${Uri.encodeComponent(widget.vehicle.tenantId)}');
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          transform: Matrix4.identity()..translate(0.0, _isHovered ? -8.0 : 0.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isHovered 
                  ? const Color(0xFF3B82F6) // blue-500
                  : const Color(0xFFE2E8F0), // slate-200
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(_isHovered ? 0.2 : 0.1),
                blurRadius: _isHovered ? 24 : 16,
                offset: Offset(0, _isHovered ? 8 : 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Imagen con badges
              Expanded(
                flex: 3,
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: Stack(
                    children: [
                      // Imagen del vehículo
                      if (hasPhotos && firstPhoto != null)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 500),
                          transform: Matrix4.identity()..scale(_isHovered ? 1.1 : 1.0),
                          child: Image.network(
                            firstPhoto,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Container(
                                color: const Color(0xFFF1F5F9),
                                child: const Center(
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              );
                            },
                            errorBuilder: (context, error, stackTrace) => Container(
                              color: const Color(0xFFF1F5F9),
                              child: const Center(
                                child: Icon(
                                  Icons.directions_car_outlined,
                                  size: 64,
                                  color: Color(0xFFCBD5E1),
                                ),
                              ),
                            ),
                          ),
                        )
                      else
                        Container(
                          color: const Color(0xFFF1F5F9), // slate-100
                          child: const Center(
                            child: Icon(
                              Icons.image_outlined,
                              size: 64,
                              color: Color(0xFFCBD5E1), // slate-300
                            ),
                          ),
                        ),
                      // Badge de condición (esquina superior izquierda)
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _getConditionColor(widget.vehicle.condition),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.2),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Text(
                            _getConditionLabel(widget.vehicle.condition),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      // Contador de fotos (esquina superior derecha)
                      if (photoCount > 1)
                        Positioned(
                          top: 12,
                          right: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.7),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '+${photoCount - 1} fotos',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      // Stock Number (esquina inferior izquierda)
                      if (widget.vehicle.stockNumber != null)
                        Positioned(
                          bottom: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              '#${widget.vehicle.stockNumber}',
                              style: const TextStyle(
                                color: Color(0xFF2563EB), // blue-600
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              
              // Información del vehículo
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Título y precio
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              '${widget.vehicle.year} ${widget.vehicle.make} ${widget.vehicle.model}',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: _isHovered 
                                    ? const Color(0xFF2563EB) // blue-600
                                    : const Color(0xFF111827), // gray-900
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            '${widget.vehicle.currency} ${NumberFormat('#,###').format(widget.vehicle.price.toInt())}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF10B981), // green-600
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      // Especificaciones
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (widget.vehicle.mileage != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3F4F6), // gray-100
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '📏 ${NumberFormat('#,###').format(widget.vehicle.mileage!.toInt())} millas',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF4B5563), // gray-600
                                ),
                              ),
                            ),
                          if (widget.vehicle.specifications.transmission != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '⚙️ ${widget.vehicle.specifications.transmission!.name}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            ),
                          if (widget.vehicle.specifications.fuelType != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '⛽ ${widget.vehicle.specifications.fuelType!.name}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      // Descripción
                      Expanded(
                        child: Text(
                          widget.vehicle.description,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade700,
                            height: 1.4,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // Botones Ver Detalles y Añadir a comparar
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                context.go('/catalog/${widget.vehicle.id}?tenantId=${Uri.encodeComponent(widget.vehicle.tenantId)}');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0F172A),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              child: const Text('Ver Detalles', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: () {
                              context.read<CompareProvider>().add(widget.vehicle.id, widget.vehicle.tenantId);
                              final count = context.read<CompareProvider>().count;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(count >= 2 ? 'Añadido. Ver comparación ($count)' : 'Añadido a comparación'),
                                  action: count >= 2
                                      ? SnackBarAction(
                                          label: 'Comparar',
                                          onPressed: () => context.go('/compare?${context.read<CompareProvider>().queryParams}'),
                                        )
                                      : null,
                                ),
                              );
                            },
                            icon: const Icon(Icons.compare_arrows),
                            tooltip: 'Añadir a comparación',
                          ),
                        ],
                      ),
                    ],
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


