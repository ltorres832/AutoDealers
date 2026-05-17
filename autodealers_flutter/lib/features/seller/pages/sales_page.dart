// Página de Ventas del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/sales_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/sale.dart';
import '../widgets/seller_drawer.dart';

class SellerSalesPage extends StatefulWidget {
  const SellerSalesPage({super.key});

  @override
  State<SellerSalesPage> createState() => _SellerSalesPageState();
}

class _SellerSalesPageState extends State<SellerSalesPage> {
  String _statusFilter = '';
  DateTime? _dateFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final salesProvider = context.read<SalesProvider>();
      if (authProvider.user?.tenantId != null && authProvider.user?.id != null) {
        salesProvider.initialize(authProvider.user!.tenantId);
        // Cargar solo ventas del seller actual
        salesProvider.loadSales(sellerId: authProvider.user!.id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Mis Ventas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.push('/sales/create');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _statusFilter.isEmpty ? null : _statusFilter,
                    decoration: const InputDecoration(
                      labelText: 'Estado',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'pending', child: Text('Pendiente')),
                      DropdownMenuItem(value: 'completed', child: Text('Completada')),
                      DropdownMenuItem(value: 'cancelled', child: Text('Cancelada')),
                    ],
                    onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ListTile(
                    title: const Text('Fecha'),
                    subtitle: Text(_dateFilter == null ? 'Todas' : _formatDate(_dateFilter!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
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
                ),
              ],
            ),
          ),
          // Lista de ventas
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

                var filteredSales = salesProvider.sales;
                if (_statusFilter.isNotEmpty) {
                  filteredSales = filteredSales.where((sale) {
                    return sale.status.name == _statusFilter;
                  }).toList();
                }

                if (_dateFilter != null) {
                  filteredSales = filteredSales.where((sale) {
                    return sale.date.year == _dateFilter!.year &&
                        sale.date.month == _dateFilter!.month &&
                        sale.date.day == _dateFilter!.day;
                  }).toList();
                }

                if (filteredSales.isEmpty) {
                  return const Center(
                    child: Text('No tienes ventas registradas'),
                  );
                }

                return ListView.builder(
                  itemCount: filteredSales.length,
                  itemBuilder: (context, index) {
                    final sale = filteredSales[index];
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
                        title: Text('Venta #${sale.id.substring(0, 8)}'),
                        subtitle: Text(
                          '${_formatDate(sale.date)} • ${sale.vehicleMake ?? 'N/A'} ${sale.vehicleModel ?? ''}',
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '\$${sale.totalAmount.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Chip(
                              label: Text(sale.status.name),
                            ),
                          ],
                        ),
                        onTap: () {
                          context.push('/sales/${sale.id}');
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
}


