import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../core/data/repositories/inventory_repository.dart';
import '../../../core/data/services/storage_service.dart';
import '../../../core/domain/models/photo_guide.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../dealer/widgets/dealer_drawer.dart';
import '../../seller/widgets/seller_drawer.dart';

class PhotoGuidePage extends StatefulWidget {
  final String vehicleId;

  const PhotoGuidePage({super.key, required this.vehicleId});

  @override
  State<PhotoGuidePage> createState() => _PhotoGuidePageState();
}

class _PhotoGuidePageState extends State<PhotoGuidePage> {
  final _repo = InventoryRepository();
  final _storage = StorageService();
  final _picker = ImagePicker();

  List<VehiclePhotoSlot> _slots = [];
  bool _loading = true;
  bool _busy = false;
  String? _error;
  String? _message;
  String? _tenantId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final tenantId = auth.user?.tenantId;
    if (tenantId == null || tenantId.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'No se encontró tenantId';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _tenantId = tenantId;
    });
    try {
      final slots = await _repo.getVehiclePhotoSet(
        tenantId: tenantId,
        vehicleId: widget.vehicleId,
      );
      if (!mounted) return;
      setState(() {
        _slots = slots;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  VehiclePhotoSlot? _slotFor(String angleId) {
    try {
      return _slots.firstWhere((s) => s.angleId == angleId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickAndUpload(String angleId) async {
    final tenantId = _tenantId;
    if (tenantId == null) return;

    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (picked == null) return;

    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      final url = await _storage.uploadImage(
        file: File(picked.path),
        path: 'vehicles/${widget.vehicleId}/photo_guide',
        tenantId: tenantId,
      );
      final slots = await _repo.upsertVehiclePhotoSlot(
        tenantId: tenantId,
        vehicleId: widget.vehicleId,
        angleId: angleId,
        originalUrl: url,
      );
      if (!mounted) return;
      setState(() {
        _slots = slots;
        _message = 'Foto original guardada (no se borra la anterior).';
      });
      // Refrescar lista de vehículos por si se anexó a photos
      context.read<InventoryProvider>().loadVehicles();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    final drawer = path.startsWith('/dealer/')
        ? const DealerDrawer()
        : path.startsWith('/seller/')
            ? const SellerDrawer()
            : null;

    return Scaffold(
      drawer: drawer,
      appBar: AppBar(
        title: const Text('Guía de fotos'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Sigue los ángulos. El archivo original siempre se conserva.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  if (_message != null) ...[
                    const SizedBox(height: 12),
                    Text(_message!, style: TextStyle(color: Colors.green.shade800)),
                  ],
                  const SizedBox(height: 16),
                  ...kPhotoGuideAngles.map((angle) {
                    final slot = _slotFor(angle.id);
                    final url = slot?.displayUrl;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              angle.label,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              angle.hint,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                              ),
                            ),
                            const SizedBox(height: 12),
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade200,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: url != null && url.isNotEmpty
                                    ? CachedNetworkImage(
                                        imageUrl: url,
                                        fit: BoxFit.contain,
                                        placeholder: (_, __) => const Center(
                                          child: CircularProgressIndicator(),
                                        ),
                                        errorWidget: (_, __, ___) =>
                                            const Icon(Icons.broken_image),
                                      )
                                    : const Center(
                                        child: Text(
                                          'Sin foto',
                                          style: TextStyle(color: Colors.black38),
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: _busy
                                  ? null
                                  : () => _pickAndUpload(angle.id),
                              icon: const Icon(Icons.add_a_photo),
                              label: Text(
                                slot?.originalUrl.isNotEmpty == true
                                    ? 'Cambiar / agregar foto'
                                    : 'Agregar foto',
                              ),
                            ),
                            if (slot?.originalUrl.isNotEmpty == true)
                              const Padding(
                                padding: EdgeInsets.only(top: 6),
                                child: Text(
                                  'Original OK',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.black45,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }),
                  if (_busy)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                ],
              ),
            ),
    );
  }
}
