// Página de Reportes Avanzados (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/reports_provider.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminReportsPage extends StatefulWidget {
  const AdminReportsPage({super.key});

  @override
  State<AdminReportsPage> createState() => _AdminReportsPageState();
}

class _AdminReportsPageState extends State<AdminReportsPage> {
  String _reportType = 'leads';
  String? _selectedTenantId;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _startDate = DateTime.now().subtract(const Duration(days: 30));
    _endDate = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadTenants();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reportes Avanzados'),
      ),
      body: Consumer2<ReportsProvider, AdminProvider>(
        builder: (context, reportsProvider, adminProvider, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String?>(
                  value: _selectedTenantId,
                  decoration: const InputDecoration(
                    labelText: 'Tenant (opcional)',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('-- Todos --')),
                    ...adminProvider.tenants.map((t) {
                      final id = t['id'] as String?;
                      final name = t['name'] as String? ?? id ?? '';
                      return DropdownMenuItem(value: id, child: Text(name));
                    }),
                  ],
                  onChanged: (value) => setState(() => _selectedTenantId = value),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _reportType,
                  decoration: const InputDecoration(
                    labelText: 'Tipo de Reporte',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'leads', child: Text('Leads')),
                    DropdownMenuItem(value: 'sales', child: Text('Ventas')),
                    DropdownMenuItem(value: 'vehicles', child: Text('Vehículos')),
                    DropdownMenuItem(value: 'revenue', child: Text('Ingresos')),
                  ],
                  onChanged: (value) => setState(() => _reportType = value ?? 'leads'),
                ),
                const SizedBox(height: 16),
                ListTile(
                  title: const Text('Fecha de Inicio'),
                  subtitle: Text(_startDate?.toString().split(' ')[0] ?? 'Seleccionar fecha'),
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
                  subtitle: Text(_endDate?.toString().split(' ')[0] ?? 'Seleccionar fecha'),
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
                  onPressed: () async {
                    final tenantId = _selectedTenantId;
                    if (tenantId == null || tenantId.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Seleccione un tenant para generar el reporte')),
                      );
                      return;
                    }
                    await reportsProvider.initialize(tenantId);
                    final filters = <String, dynamic>{
                      if (_startDate != null) 'startDate': _startDate!.toIso8601String(),
                      if (_endDate != null) 'endDate': _endDate!.toIso8601String(),
                    };
                    switch (_reportType) {
                      case 'leads':
                        await reportsProvider.generateLeadsReport(filters: filters);
                        break;
                      case 'sales':
                        await reportsProvider.generateSalesReport(filters: filters);
                        break;
                      case 'vehicles':
                        break;
                      case 'revenue':
                        await reportsProvider.generateSalesReport(filters: filters);
                        break;
                    }
                  },
                  child: const Text('Generar Reporte'),
                ),
                if (reportsProvider.isLoading)
                  const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_reportType == 'leads' && reportsProvider.leadsReport != null)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text('Datos del reporte: ${reportsProvider.leadsReport}'),
                  )
                else if (_reportType == 'sales' && reportsProvider.salesReport != null)
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text('Datos del reporte: ${reportsProvider.salesReport}'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}


