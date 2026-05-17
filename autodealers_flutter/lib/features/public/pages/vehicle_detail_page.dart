// Detalle de Vehículo Público - Réplica de Next.js [subdomain]/vehicle/[id]
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/domain/models/vehicle.dart';
import '../../../core/data/repositories/inventory_repository.dart';

class PublicVehicleDetailPage extends StatelessWidget {
  final String vehicleId;
  final String? tenantId;

  const PublicVehicleDetailPage({
    super.key,
    required this.vehicleId,
    this.tenantId,
  });

  @override
  Widget build(BuildContext context) {
    if (tenantId == null || tenantId!.isEmpty) {
      return _buildNotFound(context);
    }
    final repository = InventoryRepository();
    return StreamBuilder<Vehicle?>(
      stream: repository.watchVehicle(vehicleId, tenantId: tenantId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(
                    'Cargando vehículo...',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 18),
                  ),
                ],
              ),
            ),
          );
        }
        final vehicle = snapshot.data;
        if (snapshot.hasError || vehicle == null) {
          return _buildNotFound(context);
        }
        return _VehicleDetailContent(vehicle: vehicle);
      },
    );
  }

  Widget _buildNotFound(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🚗', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 24),
              Text(
                'Vehículo no encontrado',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade900,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'El vehículo que buscas no está disponible.',
                style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () => context.go('/'),
                icon: const Icon(Icons.arrow_back),
                label: const Text('Volver al Inicio'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  backgroundColor: const Color(0xFF2563EB),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VehicleDetailContent extends StatefulWidget {
  final Vehicle vehicle;

  const _VehicleDetailContent({required this.vehicle});

  @override
  State<_VehicleDetailContent> createState() => _VehicleDetailContentState();
}

class _VehicleDetailContentState extends State<_VehicleDetailContent> {
  int _currentPhotoIndex = 0;

  static String _conditionLabel(VehicleCondition c) {
    switch (c) {
      case VehicleCondition.new_: return 'Nuevo';
      case VehicleCondition.certified: return 'Certificado';
      case VehicleCondition.used: return 'Usado';
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.vehicle;
    final photos = v.photos.where((s) => s.trim().isNotEmpty).toList();
    final hasPhotos = photos.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('AutoDealers'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.grey.shade900,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: () => context.go('/'),
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Volver al Inicio'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Text(
                    '${v.year} ${v.make} ${v.model}',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade900,
                    ),
                  ),
                  if (v.stockNumber != null) ...[
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Text(
                        '#${v.stockNumber}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade800,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            // Galería
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 4 / 3,
                  child: hasPhotos
                      ? Stack(
                          children: [
                            Image.network(
                              photos[_currentPhotoIndex],
                              fit: BoxFit.cover,
                              width: double.infinity,
                              height: double.infinity,
                              loadingBuilder: (_, child, progress) => progress == null
                                  ? child
                                  : const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                              errorBuilder: (_, __, ___) => const Center(
                                child: Icon(Icons.directions_car, size: 80, color: Colors.grey),
                              ),
                            ),
                            if (photos.length > 1) ...[
                              Positioned(
                                left: 8,
                                top: 0,
                                bottom: 0,
                                child: Center(
                                  child: IconButton(
                                    onPressed: () {
                                      setState(() {
                                        _currentPhotoIndex = (_currentPhotoIndex - 1 + photos.length) % photos.length;
                                      });
                                    },
                                    icon: const Icon(Icons.chevron_left),
                                    style: IconButton.styleFrom(
                                      backgroundColor: Colors.white70,
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                right: 8,
                                top: 0,
                                bottom: 0,
                                child: Center(
                                  child: IconButton(
                                    onPressed: () {
                                      setState(() {
                                        _currentPhotoIndex = (_currentPhotoIndex + 1) % photos.length;
                                      });
                                    },
                                    icon: const Icon(Icons.chevron_right),
                                    style: IconButton.styleFrom(
                                      backgroundColor: Colors.white70,
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                bottom: 8,
                                left: 0,
                                right: 0,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: List.generate(
                                    photos.length,
                                    (i) => GestureDetector(
                                      onTap: () => setState(() => _currentPhotoIndex = i),
                                      child: Container(
                                        margin: const EdgeInsets.symmetric(horizontal: 2),
                                        width: i == _currentPhotoIndex ? 24 : 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: i == _currentPhotoIndex
                                              ? Colors.white
                                              : Colors.white54,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        )
                      : const Center(
                          child: Icon(Icons.directions_car, size: 80, color: Colors.grey),
                        ),
                ),
              ),
            ),
            if (hasPhotos && photos.length > 1)
              Padding(
                padding: const EdgeInsets.all(12),
                child: SizedBox(
                  height: 64,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: photos.length,
                    itemBuilder: (context, i) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _currentPhotoIndex = i),
                          child: Container(
                            width: 64,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: i == _currentPhotoIndex ? Colors.blue : Colors.grey.shade300,
                                width: i == _currentPhotoIndex ? 2 : 1,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(7),
                              child: Image.network(
                                photos[i],
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.image),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            const SizedBox(height: 24),
            // Precio y datos en card lateral (sticky en desktop; aquí en columna)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${v.currency} ${NumberFormat('#,###').format(v.price)}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF059669),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _chip(
                          'Millaje: ${NumberFormat('#,###').format(v.mileage ?? 0)} millas',
                          Colors.grey.shade100,
                        ),
                        _chip(_conditionLabel(v.condition), Colors.grey.shade100),
                        if (v.specifications.transmission != null)
                          _chip(
                            v.specifications.transmission!.name.toUpperCase(),
                            Colors.grey.shade100,
                          ),
                        if (v.specifications.fuelType != null)
                          _chip(
                            v.specifications.fuelType!.name.toUpperCase(),
                            Colors.grey.shade100,
                          ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final text = Uri.encodeComponent(
                            'Hola, estoy interesado en ${v.year} ${v.make} ${v.model} - ${v.currency} ${NumberFormat('#,###').format(v.price)}',
                          );
                          final uri = Uri.parse('https://wa.me/?text=$text');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          } else {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('No se pudo abrir WhatsApp')),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.chat),
                        label: const Text('Contactar por WhatsApp'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF25D366),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => context.go('/contact'),
                        icon: const Icon(Icons.email_outlined),
                        label: const Text('Enviar consulta'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Descripción
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.description, color: Colors.blue.shade600),
                        const SizedBox(width: 8),
                        Text(
                          'Descripción',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      v.description.isEmpty
                          ? 'No hay descripción disponible para este vehículo.'
                          : v.description,
                      style: TextStyle(
                        fontSize: 16,
                        height: 1.5,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Especificaciones
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.build, color: Colors.blue.shade600),
                        const SizedBox(width: 8),
                        Text(
                          'Especificaciones',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade900,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        if (v.specifications.vin != null)
                          _specChip('VIN', v.specifications.vin!),
                        if (v.specifications.stockNumber != null)
                          _specChip('Stock', v.specifications.stockNumber!),
                        if (v.specifications.color != null)
                          _specChip('Color', v.specifications.color!),
                        if (v.specifications.transmission != null)
                          _specChip('Transmisión', v.specifications.transmission!.name),
                        if (v.specifications.fuelType != null)
                          _specChip('Combustible', v.specifications.fuelType!.name),
                        if (v.specifications.engine != null)
                          _specChip('Motor', v.specifications.engine!),
                        if (v.specifications.doors != null)
                          _specChip('Puertas', '${v.specifications.doors}'),
                        if (v.specifications.seats != null)
                          _specChip('Asientos', '${v.specifications.seats}'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: Colors.grey.shade800,
        ),
      ),
    );
  }

  Widget _specChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade900,
            ),
          ),
        ],
      ),
    );
  }
}

