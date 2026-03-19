// Página de Gestión de FI (Financiamiento e Seguros) (Admin)
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/fi_provider.dart';

class AdminFIPage extends StatefulWidget {
  const AdminFIPage({super.key});

  @override
  State<AdminFIPage> createState() => _AdminFIPageState();
}

class _AdminFIPageState extends State<AdminFIPage> {
  final _vehiclePriceController = TextEditingController();
  final _downPaymentController = TextEditingController();
  final _interestRateController = TextEditingController();
  final _loanTermController = TextEditingController();
  double _monthlyPayment = 0.0;

  @override
  void dispose() {
    _vehiclePriceController.dispose();
    _downPaymentController.dispose();
    _interestRateController.dispose();
    _loanTermController.dispose();
    super.dispose();
  }

  void _calculatePayment() {
    final vehiclePrice = double.tryParse(_vehiclePriceController.text) ?? 0.0;
    final downPayment = double.tryParse(_downPaymentController.text) ?? 0.0;
    final interestRate = double.tryParse(_interestRateController.text) ?? 0.0;
    final loanTerm = int.tryParse(_loanTermController.text) ?? 0;

    if (vehiclePrice > 0 && loanTerm > 0) {
      final loanAmount = vehiclePrice - downPayment;
      final monthlyRate = (interestRate / 100) / 12;
      if (monthlyRate > 0) {
        _monthlyPayment = loanAmount *
            (monthlyRate * pow(1 + monthlyRate, loanTerm)) /
            (pow(1 + monthlyRate, loanTerm) - 1);
      } else {
        _monthlyPayment = loanAmount / loanTerm;
      }
      setState(() {});
    }
  }

  Widget _buildCalculatorTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Calculadora de Financiamiento',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _vehiclePriceController,
            decoration: const InputDecoration(
              labelText: 'Precio del Vehículo',
              border: OutlineInputBorder(),
              prefixText: '\$ ',
            ),
            keyboardType: TextInputType.number,
            onChanged: (_) => _calculatePayment(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _downPaymentController,
            decoration: const InputDecoration(
              labelText: 'Enganche',
              border: OutlineInputBorder(),
              prefixText: '\$ ',
            ),
            keyboardType: TextInputType.number,
            onChanged: (_) => _calculatePayment(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _interestRateController,
            decoration: const InputDecoration(
              labelText: 'Tasa de Interés Anual (%)',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            onChanged: (_) => _calculatePayment(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _loanTermController,
            decoration: const InputDecoration(
              labelText: 'Plazo (meses)',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            onChanged: (_) => _calculatePayment(),
          ),
          const SizedBox(height: 24),
          if (_monthlyPayment > 0)
            Card(
              color: Colors.green.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Text(
                      'Pago Mensual',
                      style: TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '\$${_monthlyPayment.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Financiamiento e Seguros'),
      ),
      body: Consumer<FIProvider>(
        builder: (context, fiProvider, _) {
          if (fiProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return DefaultTabController(
            length: 3,
            child: Column(
              children: [
                const TabBar(
                  tabs: [
                    Tab(text: 'Solicitudes'),
                    Tab(text: 'Clientes'),
                    Tab(text: 'Calculadora'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      // Tab de Solicitudes
                      fiProvider.fiRequests.isEmpty
                          ? const Center(child: Text('No hay solicitudes'))
                          : ListView.builder(
                              itemCount: fiProvider.fiRequests.length,
                              itemBuilder: (context, index) {
                                final request = fiProvider.fiRequests[index];
                                return Card(
                                  margin: const EdgeInsets.all(8),
                                  child: ListTile(
                                    title: Text('Cliente: ${request['customerName'] ?? 'N/A'}'),
                                    subtitle: Text('Estado: ${request['status'] ?? 'unknown'}'),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => context.push('/admin/fi/requests/${request['id']}'),
                                  ),
                                );
                              },
                            ),
                      // Tab de Clientes
                      fiProvider.fiClients.isEmpty
                          ? const Center(child: Text('No hay clientes'))
                          : ListView.builder(
                              itemCount: fiProvider.fiClients.length,
                              itemBuilder: (context, index) {
                                final client = fiProvider.fiClients[index];
                                return Card(
                                  margin: const EdgeInsets.all(8),
                                  child: ListTile(
                                    title: Text(client['name'] ?? 'Sin nombre'),
                                    subtitle: Text('Score: ${client['approvalScore'] ?? 'N/A'}'),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => context.push('/admin/fi/clients/${client['id']}'),
                                  ),
                                );
                              },
                            ),
                      // Tab de Calculadora
                      _buildCalculatorTab(),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


