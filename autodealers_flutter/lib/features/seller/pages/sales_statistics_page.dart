// Página de Estadísticas de Ventas del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/sales_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/sale.dart';
import '../widgets/seller_drawer.dart';

class SellerSalesStatisticsPage extends StatefulWidget {
  const SellerSalesStatisticsPage({super.key});

  @override
  State<SellerSalesStatisticsPage> createState() => _SellerSalesStatisticsPageState();
}

class _SellerSalesStatisticsPageState extends State<SellerSalesStatisticsPage> {
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
      if (authProvider.user?.tenantId != null && authProvider.user?.id != null) {
        salesProvider.initialize(authProvider.user!.tenantId);
        salesProvider.loadSales(sellerId: authProvider.user!.id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Estadísticas de Ventas'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Selector de fechas
            Row(
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
                      if (picked != null) setState(() => _startDate = picked);
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
                      if (picked != null) setState(() => _endDate = picked);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Estadísticas
            Consumer<SalesProvider>(
              builder: (context, salesProvider, _) {
                if (salesProvider.isLoading && salesProvider.sales.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
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
                final averageSale = completedSales > 0 ? totalRevenue / completedSales : 0.0;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      children: [
                        _buildStatCard(
                          'Total Ventas',
                          '$totalSales',
                          Icons.shopping_cart,
                          Colors.blue,
                        ),
                        _buildStatCard(
                          'Completadas',
                          '$completedSales',
                          Icons.check_circle,
                          Colors.green,
                        ),
                        _buildStatCard(
                          'Ingresos Totales',
                          '\$${totalRevenue.toStringAsFixed(2)}',
                          Icons.attach_money,
                          Colors.orange,
                        ),
                        _buildStatCard(
                          'Promedio',
                          '\$${averageSale.toStringAsFixed(2)}',
                          Icons.trending_up,
                          Colors.purple,
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
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


