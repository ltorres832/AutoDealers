import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/sales_service.dart';
import 'package:intl/intl.dart';

/// Página de Estadísticas de Ventas
class SalesStatisticsPage extends StatefulWidget {
  const SalesStatisticsPage({super.key});

  @override
  State<SalesStatisticsPage> createState() => _SalesStatisticsPageState();
}

class _SalesStatisticsPageState extends State<SalesStatisticsPage> {
  final SalesService _salesService = SalesService();
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _loading = true);
    try {
      final now = DateTime.now();
      final startOfMonth = DateTime(now.year, now.month, 1);
      final stats = await _salesService.getSalesStats(
        startDate: startOfMonth,
        endDate: now,
      );
      setState(() {
        _stats = stats;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Estadísticas de Ventas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStats,
          ),
        ],
      ),
      body: _stats == null
          ? const Center(child: Text('Error al cargar estadísticas'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Tarjetas de estadísticas
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          title: 'Total Ventas',
                          value: '${_stats!['totalSales'] ?? 0}',
                          icon: Icons.shopping_cart,
                          color: Colors.blue,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _StatCard(
                          title: 'Revenue Total',
                          value: '\$${NumberFormat('#,###').format(_stats!['totalRevenue'] ?? 0)}',
                          icon: Icons.attach_money,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _StatCard(
                    title: 'Venta Promedio',
                    value: '\$${NumberFormat('#,###').format(_stats!['averageSale'] ?? 0)}',
                    icon: Icons.trending_up,
                    color: Colors.orange,
                  ),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
        ),
      ),
    );
  }
}


