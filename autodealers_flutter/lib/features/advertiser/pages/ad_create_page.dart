// Página para crear un anuncio (Advertiser)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/advertiser_provider.dart';

class AdvertiserAdCreatePage extends StatefulWidget {
  const AdvertiserAdCreatePage({super.key});

  @override
  State<AdvertiserAdCreatePage> createState() => _AdvertiserAdCreatePageState();
}

class _AdvertiserAdCreatePageState extends State<AdvertiserAdCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _campaignName = TextEditingController();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _linkUrl = TextEditingController();
  final _imageUrl = TextEditingController();
  String _type = 'banner';
  String _placement = 'sidebar';
  int _durationDays = 7;
  final _priceController = TextEditingController(text: '10'); // La API requiere precio; el servidor puede ajustar según config

  @override
  void dispose() {
    _campaignName.dispose();
    _title.dispose();
    _description.dispose();
    _linkUrl.dispose();
    _imageUrl.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final provider = context.read<AdvertiserProvider>();
    final body = <String, dynamic>{
      'type': _type,
      'placement': _placement,
      'campaignName': _campaignName.text.trim().isEmpty ? _title.text.trim() : _campaignName.text.trim(),
      'title': _title.text.trim(),
      'description': _description.text.trim(),
      'linkUrl': _linkUrl.text.trim(),
      'linkType': 'external',
      'durationDays': _durationDays,
      'mediaType': 'image',
      'imageUrl': _imageUrl.text.trim(),
      'price': double.tryParse(_priceController.text.replaceAll(',', '.')) ?? 10,
      'startDate': DateTime.now().toIso8601String(),
    };
    final result = await provider.createAd(body);
    if (!mounted) return;
    if (result == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${provider.error ?? "No se pudo crear"}')),
      );
      return;
    }
    final payment = result['payment'] as Map<String, dynamic>?;
    if (payment != null && (payment['url'] != null || payment['clientSecret'] != null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Anuncio creado. Completa el pago en Facturación o en el enlace que recibirás.'),
          duration: Duration(seconds: 5),
        ),
      );
      context.go('/advertiser/ads');
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Anuncio creado')));
    context.go('/advertiser/ads');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear anuncio'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _campaignName,
              decoration: const InputDecoration(labelText: 'Nombre de campaña'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Tipo'),
              items: const [
                DropdownMenuItem(value: 'banner', child: Text('Banner')),
                DropdownMenuItem(value: 'promotion', child: Text('Promoción')),
                DropdownMenuItem(value: 'sponsor', child: Text('Patrocinado')),
              ],
              onChanged: (v) => setState(() => _type = v ?? 'banner'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _placement,
              decoration: const InputDecoration(labelText: 'Ubicación'),
              items: const [
                DropdownMenuItem(value: 'hero', child: Text('Hero')),
                DropdownMenuItem(value: 'sidebar', child: Text('Sidebar')),
                DropdownMenuItem(value: 'sponsors_section', child: Text('Sección patrocinadores')),
                DropdownMenuItem(value: 'between_content', child: Text('Entre contenido')),
              ],
              onChanged: (v) => setState(() => _placement = v ?? 'sidebar'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Título *'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              decoration: const InputDecoration(labelText: 'Descripción'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _linkUrl,
              decoration: const InputDecoration(labelText: 'URL de destino *'),
              keyboardType: TextInputType.url,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _imageUrl,
              decoration: const InputDecoration(labelText: 'URL de imagen *'),
              keyboardType: TextInputType.url,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido para tipo imagen' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              value: _durationDays,
              decoration: const InputDecoration(labelText: 'Duración (días)'),
              items: const [
                DropdownMenuItem(value: 7, child: Text('7 días')),
                DropdownMenuItem(value: 15, child: Text('15 días')),
                DropdownMenuItem(value: 30, child: Text('30 días')),
              ],
              onChanged: (v) => setState(() => _durationDays = v ?? 7),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _priceController,
              decoration: const InputDecoration(
                labelText: 'Precio (USD)',
                hintText: 'El servidor puede ajustar según tarifas',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                final n = double.tryParse(v?.replaceAll(',', '.') ?? '');
                if (n == null || n <= 0) return 'Indica un precio válido';
                return null;
              },
            ),
            const SizedBox(height: 24),
            Consumer<AdvertiserProvider>(
              builder: (context, provider, _) {
                return ElevatedButton(
                  onPressed: provider.isLoading ? null : _submit,
                  child: provider.isLoading
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Crear anuncio'),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}


