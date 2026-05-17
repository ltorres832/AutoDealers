import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../utils/customer_file_helpers.dart';
import '../providers/auth_provider.dart';
import '../providers/customer_files_provider.dart';

class CustomerFileDetailPage extends StatefulWidget {
  final String fileId;

  const CustomerFileDetailPage({super.key, required this.fileId});

  @override
  State<CustomerFileDetailPage> createState() => _CustomerFileDetailPageState();
}

class _CustomerFileDetailPageState extends State<CustomerFileDetailPage> {
  Map<String, dynamic>? _file;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final tenantId = context.read<AuthProvider>().user?.tenantId;
    final provider = context.read<CustomerFilesProvider>();
    if (tenantId != null) {
      await provider.initialize(tenantId);
    }
    final file = await provider.getFileById(widget.fileId);
    if (mounted) {
      setState(() {
        _file = file;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Caso de cliente')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _file == null
              ? const Center(child: Text('No se encontró el caso'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      customerFileDisplayName(_file!),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text('Teléfono: ${customerFilePhone(_file!)}'),
                    const SizedBox(height: 4),
                    Text('Estado: ${customerFileStatusLabel(_file!['status']?.toString())}'),
                    const SizedBox(height: 4),
                    Text('Expedición: ${customerFileExpeditionLabel(_file!)}'),
                    if (_file!['uploadToken'] != null) ...[
                      const SizedBox(height: 16),
                      const Text('Token de subida', style: TextStyle(fontWeight: FontWeight.bold)),
                      SelectableText(_file!['uploadToken'].toString()),
                      TextButton.icon(
                        onPressed: () {
                          Clipboard.setData(
                            ClipboardData(text: _file!['uploadToken'].toString()),
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Token copiado')),
                          );
                        },
                        icon: const Icon(Icons.copy),
                        label: const Text('Copiar token'),
                      ),
                    ],
                    const SizedBox(height: 16),
                    const Text('Documentos', style: TextStyle(fontWeight: FontWeight.bold)),
                    ..._documents().map(
                      (d) => ListTile(
                        leading: const Icon(Icons.description),
                        title: Text(d['name']?.toString() ?? 'Documento'),
                        subtitle: Text(d['type']?.toString() ?? ''),
                      ),
                    ),
                    if (_documents().isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text('Sin documentos cargados'),
                      ),
                  ],
                ),
    );
  }

  List<Map<String, dynamic>> _documents() {
    final docs = _file!['documents'];
    if (docs is List) {
      return docs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }
}
