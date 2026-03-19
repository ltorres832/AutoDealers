// Página de Reportes del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/reports_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerReportsPage extends StatefulWidget {
  const SellerReportsPage({super.key});

  @override
  State<SellerReportsPage> createState() => _SellerReportsPageState();
}

class _SellerReportsPageState extends State<SellerReportsPage> {
  String _reportType = 'sales';
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _startDate = DateTime.now().subtract(const Duration(days: 30));
    _endDate = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final reportsProvider = context.read<ReportsProvider>();
      if (authProvider.user?.tenantId != null && authProvider.user?.id != null) {
        reportsProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  Future<void> _generateReport() async {
    final reportsProvider = context.read<ReportsProvider>();
    final filters = <String, dynamic>{
      if (_startDate != null) 'startDate': _startDate!.toIso8601String(),
      if (_endDate != null) 'endDate': _endDate!.toIso8601String(),
    };

    if (_reportType == 'sales') {
      await reportsProvider.generateSalesReport(filters: filters);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Reportes'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              value: _reportType,
              decoration: const InputDecoration(
                labelText: 'Tipo de Reporte',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'sales', child: Text('Reporte de Ventas')),
              ],
              onChanged: (value) => setState(() => _reportType = value ?? 'sales'),
            ),
            const SizedBox(height: 16),
            ListTile(
              title: const Text('Fecha de Inicio'),
              subtitle: Text(_startDate == null ? 'Seleccionar fecha' : _formatDate(_startDate!)),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _startDate ?? DateTime.now(),
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _startDate = picked);
              },
            ),
            const SizedBox(height: 16),
            ListTile(
              title: const Text('Fecha de Fin'),
              subtitle: Text(_endDate == null ? 'Seleccionar fecha' : _formatDate(_endDate!)),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _endDate ?? DateTime.now(),
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (picked != null) setState(() => _endDate = picked);
              },
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _generateReport,
              child: const Text('Generar Reporte'),
            ),
            const SizedBox(height: 24),
            Consumer<ReportsProvider>(
              builder: (context, reportsProvider, _) {
                if (reportsProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (_reportType == 'sales' && reportsProvider.salesReport != null) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Reporte de Ventas',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          Text('Total Ventas: ${reportsProvider.salesReport!['total'] ?? 0}'),
                          Text('Ingresos: \$${reportsProvider.salesReport!['revenue'] ?? 0}'),
                          Text('Promedio: \$${reportsProvider.salesReport!['average'] ?? 0}'),
                        ],
                      ),
                    ),
                  );
                }


                return const SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}


