import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/sales_service.dart';
import '../../../core/models/sale.dart';
import 'package:intl/intl.dart';

/// Página de Ventas
class SalesPage extends StatefulWidget {
  const SalesPage({super.key});

  @override
  State<SalesPage> createState() => _SalesPageState();
}

class _SalesPageState extends State<SalesPage> {
  final SalesService _salesService = SalesService();
  String? _filterStatus;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ventas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: StreamBuilder<List<Sale>>(
        stream: _salesService.watchSales(status: _filterStatus),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final sales = snapshot.data ?? [];

          if (sales.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shopping_cart_outlined,
                      size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No hay ventas',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: sales.length,
            itemBuilder: (context, index) {
              final sale = sales[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: const Icon(Icons.shopping_cart, color: Colors.green),
                  title: Text(
                    '\$${NumberFormat('#,###').format(sale.salePrice)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Fecha: ${DateFormat('dd/MM/yyyy').format(sale.saleDate)}'),
                      if (sale.buyer != null)
                        Text('Comprador: ${sale.buyer!.fullName}'),
                    ],
                  ),
                  trailing: Chip(
                    label: Text(sale.status),
                    backgroundColor: sale.status == 'completed'
                        ? Colors.green
                        : Colors.grey,
                  ),
                  onTap: () {
                    // TODO: Navegar a detalle de venta
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filtrar Ventas'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Todas'),
              leading: Radio<String?>(
                value: null,
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Completadas'),
              leading: Radio<String?>(
                value: 'completed',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Pendientes'),
              leading: Radio<String?>(
                value: 'pending',
                groupValue: _filterStatus,
                onChanged: (value) {
                  setState(() => _filterStatus = value);
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}


