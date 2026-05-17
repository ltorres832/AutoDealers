// Página de Registro Multi-Dealer
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class MultiDealerRegisterPage extends StatefulWidget {
  final String? referralCode;

  const MultiDealerRegisterPage({
    super.key,
    this.referralCode,
  });

  @override
  State<MultiDealerRegisterPage> createState() => _MultiDealerRegisterPageState();
}

class _MultiDealerRegisterPageState extends State<MultiDealerRegisterPage> {
  final _formKey = GlobalKey<FormState>();
  
  // Información básica
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _phoneController = TextEditingController();
  
  // Información de la empresa
  final _companyNameController = TextEditingController();
  final _companyAddressController = TextEditingController();
  final _companyCityController = TextEditingController();
  final _companyStateController = TextEditingController();
  final _companyZipController = TextEditingController();
  final _companyCountryController = TextEditingController();
  final _taxIdController = TextEditingController();
  
  // Información del negocio
  final _businessTypeController = TextEditingController();
  final _numberOfLocationsController = TextEditingController();
  final _yearsInBusinessController = TextEditingController();
  final _currentInventoryController = TextEditingController();
  final _expectedDealersController = TextEditingController();
  
  // Información adicional
  final _reasonController = TextEditingController();
  final _additionalInfoController = TextEditingController();
  
  String? _selectedMembershipId;
  List<dynamic> _memberships = [];
  bool _loadingMemberships = true;
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
    _confirmPasswordController.dispose();
    _phoneController.dispose();
    _companyNameController.dispose();
    _companyAddressController.dispose();
    _companyCityController.dispose();
    _companyStateController.dispose();
    _companyZipController.dispose();
    _companyCountryController.dispose();
    _taxIdController.dispose();
    _businessTypeController.dispose();
    _numberOfLocationsController.dispose();
    _yearsInBusinessController.dispose();
    _currentInventoryController.dispose();
    _expectedDealersController.dispose();
    _reasonController.dispose();
    _additionalInfoController.dispose();
    super.dispose();
  }

  Future<void> _loadMemberships() async {
    setState(() => _loadingMemberships = true);
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3000/api/public/memberships?type=dealer'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Filtrar solo membresías Multi Dealer
        final multiDealerMemberships = (data['memberships'] ?? []).where((m) {
          return m['features']?['multiDealerEnabled'] == true;
        }).toList();
        setState(() {
          _memberships = multiDealerMemberships;
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
        _error = 'Error: $e';
        _loadingMemberships = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Las contraseñas no coinciden');
      return;
    }

    if (_passwordController.text.length < 6) {
      setState(() => _error = 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (_selectedMembershipId == null) {
      setState(() => _error = 'Debes seleccionar una membresía Multi Dealer');
      return;
    }

    if (_companyNameController.text.isEmpty || 
        _companyAddressController.text.isEmpty || 
        _companyCityController.text.isEmpty) {
      setState(() => _error = 'Debes completar todos los campos de información de la empresa');
      return;
    }

    if (_reasonController.text.isEmpty) {
      setState(() => _error = 'Debes explicar la razón para necesitar Multi Dealer');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/public/register/multi-dealer'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
          'phone': _phoneController.text.trim(),
          'companyName': _companyNameController.text.trim(),
          'companyAddress': _companyAddressController.text.trim(),
          'companyCity': _companyCityController.text.trim(),
          'companyState': _companyStateController.text.trim(),
          'companyZip': _companyZipController.text.trim(),
          'companyCountry': _companyCountryController.text.trim(),
          'taxId': _taxIdController.text.trim(),
          'businessType': _businessTypeController.text.trim(),
          'numberOfLocations': _numberOfLocationsController.text.trim(),
          'yearsInBusiness': _yearsInBusinessController.text.trim(),
          'currentInventory': _currentInventoryController.text.trim(),
          'expectedDealers': _expectedDealersController.text.trim(),
          'reasonForMultiDealer': _reasonController.text.trim(),
          'additionalInfo': _additionalInfoController.text.trim(),
          'membershipId': _selectedMembershipId,
          'referralCode': widget.referralCode,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: SelectableText('Solicitud enviada. El administrador la revisará pronto.'),
              backgroundColor: Colors.green,
            ),
          );
          context.go('/login');
        }
      } else {
        final errorData = jsonDecode(response.body);
        setState(() => _error = errorData['error'] ?? 'Error al registrar');
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
        backgroundColor: Colors.grey.shade100,
        appBar: AppBar(
          title: const SelectableText('Registro Multi-Dealer'),
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: 900,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SelectableText(
                            'Registro Multi-Dealer',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const SelectableText(
                            'Completa el formulario para solicitar acceso a Multi-Dealer. Tu solicitud será revisada por el administrador.',
                            style: TextStyle(fontSize: 14, color: Colors.grey),
                          ),
                          const SizedBox(height: 32),
                          
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
                          
                          // Información básica
                          _buildSectionTitle('Información Básica'),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _nameController,
                                  decoration: const InputDecoration(
                                    labelText: 'Nombre Completo *',
                                    border: OutlineInputBorder(),
                                  ),
                                  validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
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
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _passwordController,
                                  decoration: const InputDecoration(
                                    labelText: 'Contraseña *',
                                    border: OutlineInputBorder(),
                                  ),
                                  obscureText: true,
                                  validator: (value) {
                                    if (value?.isEmpty ?? true) return 'Requerido';
                                    if (value!.length < 6) return 'Mínimo 6 caracteres';
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _confirmPasswordController,
                                  decoration: const InputDecoration(
                                    labelText: 'Confirmar Contraseña *',
                                    border: OutlineInputBorder(),
                                  ),
                                  obscureText: true,
                                  validator: (value) {
                                    if (value?.isEmpty ?? true) return 'Requerido';
                                    if (value != _passwordController.text) return 'No coinciden';
                                    return null;
                                  },
                                ),
                              ),
                            ],
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
                          
                          const SizedBox(height: 32),
                          // Información de la empresa
                          _buildSectionTitle('Información de la Empresa'),
                          TextFormField(
                            controller: _companyNameController,
                            decoration: const InputDecoration(
                              labelText: 'Nombre de la Empresa *',
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _companyAddressController,
                            decoration: const InputDecoration(
                              labelText: 'Dirección *',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 2,
                            validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _companyCityController,
                                  decoration: const InputDecoration(
                                    labelText: 'Ciudad *',
                                    border: OutlineInputBorder(),
                                  ),
                                  validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _companyStateController,
                                  decoration: const InputDecoration(
                                    labelText: 'Estado/Provincia',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _companyZipController,
                                  decoration: const InputDecoration(
                                    labelText: 'Código Postal',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _companyCountryController,
                                  decoration: const InputDecoration(
                                    labelText: 'País *',
                                    border: OutlineInputBorder(),
                                  ),
                                  validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _taxIdController,
                                  decoration: const InputDecoration(
                                    labelText: 'Número de Identificación Fiscal',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 32),
                          // Información del negocio
                          _buildSectionTitle('Información del Negocio'),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _businessTypeController,
                                  decoration: const InputDecoration(
                                    labelText: 'Tipo de Negocio',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _numberOfLocationsController,
                                  decoration: const InputDecoration(
                                    labelText: 'Número de Ubicaciones',
                                    border: OutlineInputBorder(),
                                  ),
                                  keyboardType: TextInputType.number,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _yearsInBusinessController,
                                  decoration: const InputDecoration(
                                    labelText: 'Años en el Negocio',
                                    border: OutlineInputBorder(),
                                  ),
                                  keyboardType: TextInputType.number,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _currentInventoryController,
                                  decoration: const InputDecoration(
                                    labelText: 'Inventario Actual Aproximado',
                                    border: OutlineInputBorder(),
                                  ),
                                  keyboardType: TextInputType.number,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: TextFormField(
                                  controller: _expectedDealersController,
                                  decoration: const InputDecoration(
                                    labelText: 'Dealers Esperados *',
                                    border: OutlineInputBorder(),
                                  ),
                                  keyboardType: TextInputType.number,
                                  validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 32),
                          // Información adicional
                          _buildSectionTitle('Información Adicional'),
                          TextFormField(
                            controller: _reasonController,
                            decoration: const InputDecoration(
                              labelText: 'Razón para necesitar Multi Dealer *',
                              border: OutlineInputBorder(),
                              hintText: 'Explica por qué necesitas gestionar múltiples dealers',
                            ),
                            maxLines: 3,
                            validator: (value) => value?.isEmpty ?? true ? 'Requerido' : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _additionalInfoController,
                            decoration: const InputDecoration(
                              labelText: 'Información Adicional',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 3,
                          ),
                          
                          const SizedBox(height: 32),
                          // Selección de membresía
                          _buildSectionTitle('Selecciona tu Plan Multi-Dealer'),
                          if (_loadingMemberships)
                            const Center(child: CircularProgressIndicator())
                          else if (_memberships.isEmpty)
                            const SelectableText('No hay planes Multi-Dealer disponibles. Contacta al administrador.')
                          else
                            DropdownButtonFormField<String>(
                              initialValue: _selectedMembershipId,
                              decoration: const InputDecoration(
                                labelText: 'Plan Multi-Dealer *',
                                border: OutlineInputBorder(),
                              ),
                              items: _memberships.map<DropdownMenuItem<String>>((membership) {
                                return DropdownMenuItem<String>(
                                  value: membership['id'] as String,
                                  child: SelectableText(
                                    '${membership['name']} - \$${membership['price']}/${membership['billingCycle'] == 'monthly' ? 'mes' : 'año'}',
                                  ),
                                );
                              }).toList(),
                              onChanged: (value) => setState(() => _selectedMembershipId = value),
                              validator: (value) => value == null ? 'Selecciona un plan' : null,
                            ),
                          
                          const SizedBox(height: 32),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _handleSubmit,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                              ),
                              child: _isLoading
                                  ? const CircularProgressIndicator()
                                  : const Text('Enviar Solicitud'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: SelectableText(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
    );
  }
}


