// Página de Actividad de Vendedores del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/sales_provider.dart';
import '../../../core/presentation/providers/crm_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerSellerActivityPage extends StatefulWidget {
  const DealerSellerActivityPage({super.key});

  @override
  State<DealerSellerActivityPage> createState() => _DealerSellerActivityPageState();
}

class _DealerSellerActivityPageState extends State<DealerSellerActivityPage> {
  DateTime? _dateFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final salesProvider = context.read<SalesProvider>();
      final crmProvider = context.read<CrmProvider>();
      if (authProvider.user?.tenantId != null) {
        salesProvider.initialize(authProvider.user!.tenantId);
        crmProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Actividad de Vendedores'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _dateFilter ?? DateTime.now(),
                firstDate: DateTime.now().subtract(const Duration(days: 365)),
                lastDate: DateTime.now(),
              );
              if (picked != null) {
                setState(() => _dateFilter = picked);
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (_dateFilter != null)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Chip(
                label: Text('Fecha: ${_formatDate(_dateFilter!)}'),
                onDeleted: () => setState(() => _dateFilter = null),
              ),
            ),
          Expanded(
            child: Consumer2<SalesProvider, CrmProvider>(
              builder: (context, salesProvider, crmProvider, _) {
                if (salesProvider.isLoading && crmProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                // Agrupar actividad por vendedor
                final Map<String, Map<String, dynamic>> sellerActivity = {};

                // Procesar ventas
                for (var sale in salesProvider.sales) {
                  final sellerId = sale.sellerId ?? 'unknown';
                  if (!sellerActivity.containsKey(sellerId)) {
                    sellerActivity[sellerId] = {
                      'sales': 0,
                      'leads': 0,
                      'revenue': 0.0,
                    };
                  }
                  sellerActivity[sellerId]!['sales'] =
                      (sellerActivity[sellerId]!['sales'] as int) + 1;
                  if (sale.status.name == 'completed') {
                    sellerActivity[sellerId]!['revenue'] =
                        (sellerActivity[sellerId]!['revenue'] as double) + sale.totalAmount;
                  }
                }

                // Procesar leads
                for (var lead in crmProvider.leads) {
                  final sellerId = lead.assignedTo ?? 'unknown';
                  if (!sellerActivity.containsKey(sellerId)) {
                    sellerActivity[sellerId] = {
                      'sales': 0,
                      'leads': 0,
                      'revenue': 0.0,
                    };
                  }
                  sellerActivity[sellerId]!['leads'] =
                      (sellerActivity[sellerId]!['leads'] as int) + 1;
                }

                if (sellerActivity.isEmpty) {
                  return const Center(
                    child: Text('No hay actividad de vendedores'),
                  );
                }

                return ListView.builder(
                  itemCount: sellerActivity.length,
                  itemBuilder: (context, index) {
                    final entry = sellerActivity.entries.elementAt(index);
                    final sellerId = entry.key;
                    final activity = entry.value;

                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Text(sellerId.substring(0, 1).toUpperCase()),
                        ),
                        title: Text('Vendedor: ${sellerId.substring(0, 8)}'),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Ventas: ${activity['sales']}'),
                            Text('Leads: ${activity['leads']}'),
                            Text('Ingresos: \$${(activity['revenue'] as double).toStringAsFixed(2)}'),
                          ],
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          context.push('/admin/sellers/$sellerId');
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}


