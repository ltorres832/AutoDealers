// Página de Estadísticas de Ventas del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/sales_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/sale.dart';
import '../widgets/dealer_drawer.dart';

class DealerSalesStatisticsPage extends StatefulWidget {
  const DealerSalesStatisticsPage({super.key});

  @override
  State<DealerSalesStatisticsPage> createState() => _DealerSalesStatisticsPageState();
}

class _DealerSalesStatisticsPageState extends State<DealerSalesStatisticsPage> {
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _startDate = DateTime.now().subtract(const Duration(days: 30));
    _endDate = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final salesProvider = context.read<SalesProvider>();
      if (authProvider.user?.tenantId != null) {
        salesProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Estadísticas de Ventas'),
      ),
      body: Column(
        children: [
          // Filtros de fecha
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: ListTile(
                    title: const Text('Fecha Inicio'),
                    subtitle: Text(_startDate == null ? 'Seleccionar' : _formatDate(_startDate!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _startDate ?? DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 365)),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) {
                        setState(() => _startDate = picked);
                      }
                    },
                  ),
                ),
                Expanded(
                  child: ListTile(
                    title: const Text('Fecha Fin'),
                    subtitle: Text(_endDate == null ? 'Seleccionar' : _formatDate(_endDate!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _endDate ?? DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 365)),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) {
                        setState(() => _endDate = picked);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          // Estadísticas
          Expanded(
            child: Consumer<SalesProvider>(
              builder: (context, salesProvider, _) {
                if (salesProvider.isLoading && salesProvider.sales.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (salesProvider.error != null) {
                  return Center(
                    child: Text('Error: ${salesProvider.error}'),
                  );
                }

                final filteredSales = salesProvider.sales.where((sale) {
                  if (_startDate != null && sale.date.isBefore(_startDate!)) return false;
                  if (_endDate != null && sale.date.isAfter(_endDate!)) return false;
                  return true;
                }).toList();

                final totalSales = filteredSales.length;
                final completedSales = filteredSales.where((s) => s.status == SaleStatus.completed).length;
                final totalRevenue = filteredSales
                    .where((s) => s.status == SaleStatus.completed)
                    .fold<double>(0.0, (sum, sale) => sum + sale.totalAmount);

                return SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Tarjetas de estadísticas
                      Row(
                        children: [
                          Expanded(
                            child: _buildStatCard(
                              'Total Ventas',
                              '$totalSales',
                              Icons.shopping_cart,
                              Colors.blue,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildStatCard(
                              'Completadas',
                              '$completedSales',
                              Icons.check_circle,
                              Colors.green,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildStatCard(
                        'Ingresos Totales',
                        '\$${totalRevenue.toStringAsFixed(2)}',
                        Icons.attach_money,
                        Colors.orange,
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Ventas Recientes',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      if (filteredSales.isEmpty)
                        const Center(child: Text('No hay ventas en este período'))
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredSales.take(10).length,
                          itemBuilder: (context, index) {
                            final sale = filteredSales[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: sale.status == SaleStatus.completed
                                      ? Colors.green
                                      : Colors.orange,
                                  child: Icon(
                                    sale.status == SaleStatus.completed
                                        ? Icons.check
                                        : Icons.pending,
                                    color: Colors.white,
                                  ),
                                ),
                                title: Text('Venta #${sale.id.substring(0, 8)}'),
                                subtitle: Text(_formatDate(sale.date)),
                                trailing: Text(
                                  '\$${sale.totalAmount.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(title),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}


