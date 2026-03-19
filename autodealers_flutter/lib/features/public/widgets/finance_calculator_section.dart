// Calculadora de Financiamiento - Replica exacta de Next.js
import 'dart:math' as math;
import 'package:flutter/material.dart';

class FinanceCalculatorSection extends StatefulWidget {
  const FinanceCalculatorSection({super.key});

  @override
  State<FinanceCalculatorSection> createState() => _FinanceCalculatorSectionState();
}

class _FinanceCalculatorSectionState extends State<FinanceCalculatorSection> {
  final TextEditingController _vehiclePriceController = TextEditingController();
  final TextEditingController _downPaymentController = TextEditingController();
  final TextEditingController _interestRateController = TextEditingController(text: '5.5');
  final TextEditingController _loanTermController = TextEditingController(text: '60');
  
  double? _monthlyPayment;
  double? _totalInterest;

  @override
  void dispose() {
    _vehiclePriceController.dispose();
    _downPaymentController.dispose();
    _interestRateController.dispose();
    _loanTermController.dispose();
    super.dispose();
  }

  void _calculatePayment() {
    final price = double.tryParse(_vehiclePriceController.text) ?? 0;
    final down = double.tryParse(_downPaymentController.text) ?? 0;
    final rate = (double.tryParse(_interestRateController.text) ?? 5.5) / 100 / 12; // Monthly rate
    final term = int.tryParse(_loanTermController.text) ?? 60;
    final principal = price - down;

    if (principal <= 0 || term <= 0) {
      setState(() {
        _monthlyPayment = null;
        _totalInterest = null;
      });
      return;
    }

    if (rate == 0) {
      final monthly = principal / term;
      setState(() {
        _monthlyPayment = monthly;
        _totalInterest = 0;
      });
    } else {
      final monthly = (principal * rate * math.pow(1 + rate, term)) / (math.pow(1 + rate, term) - 1);
      setState(() {
        _monthlyPayment = monthly;
        _totalInterest = monthly * term - principal;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.blue.shade50,
            Colors.indigo.shade50,
          ],
        ),
      ),
      child: Column(
        children: [
          const Text(
            '💰 Calculadora de Financiamiento',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Calcula tu pago mensual estimado',
            style: TextStyle(
              fontSize: 20,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 48),
          
          Container(
            constraints: const BoxConstraints(maxWidth: 896),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Precio del Vehículo',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _vehiclePriceController,
                            decoration: InputDecoration(
                              prefixText: '\$',
                              hintText: '30,000',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (_) => _calculatePayment(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Enganche',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _downPaymentController,
                            decoration: InputDecoration(
                              prefixText: '\$',
                              hintText: '5,000',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (_) => _calculatePayment(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Tasa de Interés Anual (%)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _interestRateController,
                            decoration: InputDecoration(
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            keyboardType: TextInputType.numberWithOptions(decimal: true),
                            onChanged: (_) => _calculatePayment(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Plazo del Préstamo (meses)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _loanTermController,
                            decoration: InputDecoration(
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (_) => _calculatePayment(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                
                // Resultados
                if (_monthlyPayment != null)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.blue.shade600, Colors.indigo.shade600],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Column(
                          children: [
                            const Text(
                              'Pago Mensual',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '\$${_monthlyPayment!.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          width: 1,
                          height: 60,
                          color: Colors.white.withOpacity(0.3),
                        ),
                        Column(
                          children: [
                            const Text(
                              'Interés Total',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '\$${_totalInterest!.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


