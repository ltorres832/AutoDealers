// Página de Registro Completo - 4 pasos con pago integrado
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class RegistroCompletoPage extends StatefulWidget {
  final String? redirectTo;
  final String? referralCode;

  const RegistroCompletoPage({
    super.key,
    this.redirectTo,
    this.referralCode,
  });

  @override
  State<RegistroCompletoPage> createState() => _RegistroCompletoPageState();
}

class _RegistroCompletoPageState extends State<RegistroCompletoPage> {
  int _step = 1;
  final _formKey = GlobalKey<FormState>();
  
  // Paso 1: Tipo de cuenta
  String _accountType = 'dealer';
  
  // Paso 2: Información personal
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  
  // Paso 3: Información del negocio
  final _businessNameController = TextEditingController();
  final _subdomainController = TextEditingController();
  final _addressController = TextEditingController();
  
  // Paso 4: Plan
  String? _selectedMembershipId;
  List<dynamic> _memberships = [];
  bool _loadingMemberships = true;
  bool _showPayment = false;
  Map<String, dynamic>? _selectedMembership;
  Map<String, dynamic>? _registrationData;
  
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMemberships();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _businessNameController.dispose();
    _subdomainController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _loadMemberships() async {
    setState(() => _loadingMemberships = true);
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3000/api/public/memberships?type=$_accountType'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _memberships = data['memberships'] ?? [];
          _loadingMemberships = false;
        });
      } else {
        setState(() {
          _error = 'Error al cargar membresías';
          _loadingMemberships = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error al conectar: $e';
        _loadingMemberships = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_step < 4) {
      if (_step == 1) {
        // Recargar membresías cuando cambia el tipo de cuenta
        await _loadMemberships();
      }
      setState(() {
        _step++;
        _error = null;
      });
      return;
    }

    // Paso 4: Validar y procesar pago
    if (_selectedMembershipId == null) {
      setState(() => _error = 'Debes seleccionar un plan');
      return;
    }

    final membership = _memberships.firstWhere(
      (m) => m['id'] == _selectedMembershipId,
      orElse: () => null,
    );

    if (membership == null) {
      setState(() => _error = 'Plan no encontrado');
      return;
    }

    // Guardar datos de registro
    _registrationData = {
      'accountType': _accountType,
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim(),
      'password': _passwordController.text,
      'phone': _phoneController.text.trim(),
      'businessName': _businessNameController.text.trim(),
      'subdomain': _subdomainController.text.trim().isEmpty 
          ? null 
          : _subdomainController.text.trim().toLowerCase(),
      'address': _addressController.text.trim(),
      'referralCode': widget.referralCode,
    };

    setState(() {
      _selectedMembership = membership;
      _showPayment = true;
    });
  }

  Future<void> _handlePaymentSuccess(String paymentId) async {
    if (_registrationData == null || _selectedMembership == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Crear cuenta después del pago exitoso
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/public/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          ..._registrationData!,
          'membershipId': _selectedMembershipId,
          'subscriptionId': _selectedMembership!['stripePriceId'] != null ? paymentId : null,
          'paymentIntentId': _selectedMembership!['stripePriceId'] == null ? paymentId : null,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: SelectableText('¡Cuenta creada exitosamente!'),
              backgroundColor: Colors.green,
            ),
          );
          
          final redirect = widget.redirectTo ?? '/login';
          context.go('$redirect?registered=true');
        }
      } else {
        final errorData = jsonDecode(response.body);
        setState(() => _error = errorData['error'] ?? 'Error al crear cuenta');
      }
    } catch (e) {
      setState(() => _error = 'Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SelectionArea(
      child: Scaffold(
        backgroundColor: Colors.grey.shade50,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: 800,
                child: Column(
                  children: [
                    // Header
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back),
                          onPressed: () => context.go('/'),
                        ),
                        const Expanded(
                          child: SelectableText(
                            'Crea tu cuenta en AutoDealers',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const SelectableText(
                      'En solo 4 pasos tendrás tu plataforma lista',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const SizedBox(height: 32),
                    
                    // Progress Bar
                    _buildProgressBar(),
                    const SizedBox(height: 32),
                    
                    // Form Content
                    Card(
                      elevation: 4,
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: _showPayment ? _buildPaymentForm() : _buildStepContent(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProgressBar() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                _buildStepIndicator(1, 'Tipo'),
                Expanded(child: _buildStepLine(_step > 1)),
                _buildStepIndicator(2, 'Personal'),
                Expanded(child: _buildStepLine(_step > 2)),
                _buildStepIndicator(3, 'Negocio'),
                Expanded(child: _buildStepLine(_step > 3)),
                _buildStepIndicator(4, 'Plan'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text('Tipo de cuenta', style: TextStyle(fontSize: 12)),
                Text('Información', style: TextStyle(fontSize: 12)),
                Text('Negocio', style: TextStyle(fontSize: 12)),
                Text('Plan', style: TextStyle(fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int step, String label) {
    final isActive = step <= _step;
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            gradient: isActive 
                ? LinearGradient(colors: [Colors.blue.shade600, Colors.purple.shade600])
                : null,
            color: isActive ? null : Colors.grey.shade300,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$step',
              style: TextStyle(
                color: isActive ? Colors.white : Colors.grey.shade600,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(bool isActive) {
    return Container(
      height: 2,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        gradient: isActive 
            ? LinearGradient(colors: [Colors.blue.shade600, Colors.purple.shade600])
            : null,
        color: isActive ? null : Colors.grey.shade300,
      ),
    );
  }

  Widget _buildStepContent() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                border: Border.all(color: Colors.red.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: SelectableText(
                _error!,
                style: TextStyle(color: Colors.red.shade900, fontSize: 12),
              ),
            ),
          
          if (_step == 1) _buildStep1(),
          if (_step == 2) _buildStep2(),
          if (_step == 3) _buildStep3(),
          if (_step == 4) _buildStep4(),
          
          const SizedBox(height: 24),
          Row(
            children: [
              if (_step > 1)
                TextButton(
                  onPressed: () => setState(() => _step--),
                  child: const SelectableText('← Atrás'),
                ),
              const Spacer(),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : Text(_step < 4 ? 'Siguiente →' : 'Continuar al Pago 💳'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SelectableText(
          '¿Qué tipo de cuenta necesitas?',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _buildAccountTypeCard(
                'dealer',
                '🏢',
                'Concesionario',
                'Para concesionarios que gestionan múltiples vendedores e inventario completo',
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildAccountTypeCard(
                'seller',
                '👤',
                'Vendedor Individual',
                'Para vendedores independientes que gestionan sus propias ventas',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAccountTypeCard(String type, String emoji, String title, String description) {
    final isSelected = _accountType == type;
    return InkWell(
      onTap: () => setState(() => _accountType = type),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.shade50 : Colors.white,
          border: Border.all(
            color: isSelected ? Colors.blue : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 48)),
            const SizedBox(height: 8),
            SelectableText(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            SelectableText(
              description,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SelectableText(
          'Información Personal',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        TextFormField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: 'Nombre Completo *',
            border: OutlineInputBorder(),
          ),
          validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _emailController,
          decoration: const InputDecoration(
            labelText: 'Email *',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.emailAddress,
          validator: (value) {
            if (value?.isEmpty ?? true) return 'Requerido';
            if (!value!.contains('@')) return 'Email inválido';
            return null;
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _passwordController,
          decoration: const InputDecoration(
            labelText: 'Contraseña *',
            border: OutlineInputBorder(),
            helperText: 'Mínimo 8 caracteres',
          ),
          obscureText: true,
          validator: (value) {
            if (value?.isEmpty ?? true) return 'Requerido';
            if (value!.length < 8) return 'Mínimo 8 caracteres';
            return null;
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phoneController,
          decoration: const InputDecoration(
            labelText: 'Teléfono *',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.phone,
          validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SelectableText(
          'Información del Negocio',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        TextFormField(
          controller: _businessNameController,
          decoration: const InputDecoration(
            labelText: 'Nombre del Negocio *',
            border: OutlineInputBorder(),
          ),
          validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _subdomainController,
                decoration: const InputDecoration(
                  labelText: 'Subdominio *',
                  hintText: 'mi-tienda',
                  border: OutlineInputBorder(),
                ),
                onChanged: (value) {
                  final cleaned = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9-]'), '');
                  if (cleaned != value) {
                    _subdomainController.value = TextEditingValue(
                      text: cleaned,
                      selection: TextSelection.collapsed(offset: cleaned.length),
                    );
                  }
                },
                validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
              ),
            ),
            const SizedBox(width: 8),
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: SelectableText('.autodealers.com', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
        const SizedBox(height: 4),
        SelectableText(
          'Tu sitio web será: ${_subdomainController.text.isEmpty ? 'subdominio' : _subdomainController.text}.autodealers.com',
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _addressController,
          decoration: const InputDecoration(
            labelText: 'Dirección (opcional)',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _buildStep4() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SelectableText(
          'Elige tu plan',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        if (_loadingMemberships)
          const Center(child: CircularProgressIndicator())
        else if (_memberships.isEmpty)
          const SelectableText('No hay planes disponibles.')
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 0.7,
            ),
            itemCount: _memberships.length,
            itemBuilder: (context, index) {
              final membership = _memberships[index];
              final isPopular = index == (_memberships.length / 2).floor();
              final isSelected = _selectedMembershipId == membership['id'];
              return _buildMembershipCard(membership, isPopular, isSelected);
            },
          ),
      ],
    );
  }

  Widget _buildMembershipCard(Map<String, dynamic> membership, bool isPopular, bool isSelected) {
    return InkWell(
      onTap: () => setState(() => _selectedMembershipId = membership['id']),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.shade50 : Colors.white,
          border: Border.all(
            color: isSelected ? Colors.blue : (isPopular ? Colors.blue.shade300 : Colors.grey.shade300),
            width: isSelected ? 2 : (isPopular ? 2 : 1),
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isPopular)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [Colors.blue.shade600, Colors.purple.shade600]),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const SelectableText(
                  '⭐ MÁS POPULAR',
                  style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            if (isPopular) const SizedBox(height: 8),
            SelectableText(
              membership['name'] ?? 'Plan',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SelectableText(
                  '\$${membership['price'] ?? 0}',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 4),
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: SelectableText(
                    '/${membership['billingCycle'] == 'monthly' ? 'mes' : 'año'}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ),
              ],
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => setState(() => _selectedMembershipId = membership['id']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isSelected ? Colors.blue : Colors.grey.shade300,
                  foregroundColor: isSelected ? Colors.white : Colors.black,
                ),
                child: const Text('Seleccionar'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentForm() {
    if (_selectedMembership == null) return const SizedBox();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: SelectableText(
                'Completa tu Pago',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => setState(() => _showPayment = false),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SelectableText(
          'Plan seleccionado: ${_selectedMembership!['name']}',
          style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.blue.shade200),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              const SelectableText(
                'Integración con Stripe pendiente',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              SelectableText(
                'Monto: \$${_selectedMembership!['price']} / ${_selectedMembership!['billingCycle'] == 'monthly' ? 'mes' : 'año'}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => _handlePaymentSuccess('mock_payment_id'),
                child: const Text('Simular Pago Exitoso (para pruebas)'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}


