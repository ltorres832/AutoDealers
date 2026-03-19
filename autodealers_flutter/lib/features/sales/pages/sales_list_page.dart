// Página de Lista de Ventas
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/presentation/providers/sales_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/sale.dart';

class SalesListPage extends StatefulWidget {
  const SalesListPage({super.key});

  @override
  State<SalesListPage> createState() => _SalesListPageState();
}

class _SalesListPageState extends State<SalesListPage> {
  @override
  void initState() {
    super.initState();
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
      appBar: AppBar(
        title: const Text('Ventas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/sales/create'),
          ),
        ],
      ),
      body: Consumer<SalesProvider>(
        builder: (context, salesProvider, _) {
          if (salesProvider.isLoading && salesProvider.sales.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (salesProvider.error != null) {
            return Center(
              child: Text('Error: ${salesProvider.error}'),
            );
          }

          if (salesProvider.sales.isEmpty) {
            return const Center(
              child: Text('No hay ventas registradas'),
            );
          }

          // Calcular totales
          final completedSales = salesProvider.sales
              .where((s) => s.status == SaleStatus.completed)
              .toList();
          final totalSales = completedSales
              .fold<double>(0, (sum, sale) => sum + sale.total);
          final totalCommission = completedSales
              .where((s) => s.totalCommission != null)
              .fold<double>(0, (sum, sale) => sum + (sale.totalCommission ?? 0));

          return Column(
            children: [
              // Resumen
              Card(
                margin: const EdgeInsets.all(16),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Text(
                        'Resumen de Ventas',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Total: ${salesProvider.sales.isNotEmpty ? salesProvider.sales[0].currency : 'USD'} ${totalSales.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${completedSales.length} ventas completadas',
                      ),
                      if (totalCommission > 0)
                        Text(
                          'Comisiones: ${salesProvider.sales[0].currency} ${totalCommission.toStringAsFixed(2)}',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                    ],
                  ),
                ),
              ),
              // Lista de ventas
              Expanded(
                child: ListView.builder(
                  itemCount: salesProvider.sales.length,
                  itemBuilder: (context, index) {
                    final sale = salesProvider.sales[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getStatusColor(sale.status),
                          child: Icon(
                            _getStatusIcon(sale.status),
                            color: Colors.white,
                          ),
                        ),
                        title: Text(
                          '${sale.currency} ${sale.total.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (sale.buyer != null)
                              Text('Comprador: ${sale.buyer!.fullName}'),
                            Text(
                              DateFormat('dd/MM/yyyy').format(sale.createdAt),
                            ),
                            if (sale.totalCommission != null)
                              Text(
                                'Comisión: ${sale.currency} ${sale.totalCommission!.toStringAsFixed(2)}',
                                style: const TextStyle(color: Colors.green),
                              ),
                          ],
                        ),
                        trailing: Chip(
                          label: Text(_getStatusName(sale.status)),
                          backgroundColor: _getStatusColor(sale.status),
                        ),
                        onTap: () {
                          // Navegar a detalle de venta cuando se implemente
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Color _getStatusColor(SaleStatus status) {
    switch (status) {
      case SaleStatus.pending:
        return Colors.orange;
      case SaleStatus.completed:
        return Colors.green;
      case SaleStatus.cancelled:
        return Colors.red;
    }
  }

  IconData _getStatusIcon(SaleStatus status) {
    switch (status) {
      case SaleStatus.pending:
        return Icons.pending;
      case SaleStatus.completed:
        return Icons.check_circle;
      case SaleStatus.cancelled:
        return Icons.cancel;
    }
  }

  String _getStatusName(SaleStatus status) {
    switch (status) {
      case SaleStatus.pending:
        return 'Pendiente';
      case SaleStatus.completed:
        return 'Completada';
      case SaleStatus.cancelled:
        return 'Cancelada';
    }
  }
}


