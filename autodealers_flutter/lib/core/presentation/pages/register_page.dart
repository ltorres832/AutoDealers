// Página de Registro Simple - 2 pasos
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class RegisterPage extends StatefulWidget {
  final String? accountType; // 'dealer' o 'seller' desde query parameter

  const RegisterPage({
    super.key,
    this.accountType,
  });

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  int _step = 1; // Paso 1: Selección tipo cuenta, Paso 2: Formulario
  String? _selectedAccountType;
  final _formKey = GlobalKey<FormState>();
  
  // Controllers para el formulario
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _companyNameController = TextEditingController();
  final _subdomainController = TextEditingController();

  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Si viene con tipo de cuenta desde URL, empezar en paso 2
    if (widget.accountType != null && (widget.accountType == 'dealer' || widget.accountType == 'seller')) {
      _selectedAccountType = widget.accountType;
      _step = 2;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _companyNameController.dispose();
    _subdomainController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_step == 1) {
      // Avanzar al paso 2
      if (_selectedAccountType != null) {
        setState(() => _step = 2);
      } else {
        setState(() => _error = 'Selecciona un tipo de cuenta');
      }
      return;
    }

    // Paso 2: Validar y enviar formulario
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Las contraseñas no coinciden');
      return;
    }

    if (_passwordController.text.length < 6) {
      setState(() => _error = 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (_selectedAccountType == 'dealer' && _companyNameController.text.isEmpty) {
      setState(() => _error = 'Debes ingresar el nombre de la compañía');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Llamar a la API de registro
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/public/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
          'phone': _phoneController.text.trim(),
          'companyName': _selectedAccountType == 'dealer' ? _companyNameController.text.trim() : null,
          'subdomain': _subdomainController.text.trim().isEmpty ? null : _subdomainController.text.trim().toLowerCase(),
          'accountType': _selectedAccountType,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Redirigir a selección de membresía
        if (mounted) {
          context.go('/register/membership?type=$_selectedAccountType&userId=${data['userId']}&registered=true');
        }
      } else {
        final errorData = jsonDecode(response.body);
        setState(() => _error = errorData['error'] ?? 'Error al registrar');
      }
    } catch (e) {
      setState(() => _error = 'Error al conectar con el servidor: $e');
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
          title: const SelectableText('Crear Cuenta'),
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: 600,
                child: Column(
                  children: [
                    // Progress indicator
                    Row(
                      children: [
                        _buildStepIndicator(1, 'Tipo de cuenta'),
                        Expanded(child: _buildStepLine(_step > 1)),
                        _buildStepIndicator(2, 'Información'),
                      ],
                    ),
                    const SizedBox(height: 32),
                    
                    // Contenido del paso
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: _step == 1 ? _buildStep1() : _buildStep2(),
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

  Widget _buildStepIndicator(int step, String label) {
    final isActive = step <= _step;
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isActive ? Colors.blue : Colors.grey.shade300,
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
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isActive ? Colors.blue : Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(bool isActive) {
    return Container(
      height: 2,
      color: isActive ? Colors.blue : Colors.grey.shade300,
      margin: const EdgeInsets.symmetric(horizontal: 8),
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SelectableText(
          '¿Qué tipo de cuenta necesitas?',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _buildAccountTypeCard(
                'dealer',
                '🏢',
                'Concesionario',
                'Para empresas o individuos con inventario propio',
                [
                  'Puedes crear y gestionar vendedores',
                  'Dashboard completo con CRM',
                  'Página web pública con subdominio',
                  'Integración con redes sociales',
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildAccountTypeCard(
                'seller',
                '👤',
                'Vendedor',
                'Para vendedores individuales',
                [
                  'Dashboard y CRM propios',
                  'Gestión de leads y citas',
                  'Puedes pertenecer a un dealer o ser independiente',
                  'Subdominio propio (según plan)',
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            TextButton(
              onPressed: () => context.go('/login'),
              child: const SelectableText('¿Ya tienes cuenta? Inicia sesión'),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _handleSubmit,
              child: const Text('Siguiente →'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAccountTypeCard(String type, String emoji, String title, String description, List<String> features) {
    final isSelected = _selectedAccountType == type;
    return InkWell(
      onTap: () => setState(() => _selectedAccountType = type),
      child: Container(
        padding: const EdgeInsets.all(20),
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
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            SelectableText(
              description,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            ...features.map((feature) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  const Icon(Icons.check, color: Colors.green, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SelectableText(
                      feature,
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    ),
                  ),
                ],
              ),
            )),
            if (type == 'dealer') ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.go('/register/multi-dealer'),
                child: const SelectableText(
                  '¿Necesitas gestionar múltiples dealers? Multi Dealer',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStep2() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step = 1),
              ),
              const Expanded(
                child: SelectableText(
                  'Completa tu registro',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const SelectableText(
            'Después de crear tu cuenta, podrás seleccionar tu plan de membresía',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
          const SizedBox(height: 24),
          
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

          if (_selectedAccountType == 'dealer') ...[
            TextFormField(
              controller: _companyNameController,
              decoration: const InputDecoration(
                labelText: 'Nombre de la Compañía *',
                hintText: 'Ej: Grupo Automotriz ABC',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Debes ingresar el nombre de la compañía';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nombre del Dealer *',
                hintText: 'Ej: Dealer Centro',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Ingresa el nombre del dealer';
                }
                return null;
              },
            ),
          ] else ...[
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nombre completo *',
                hintText: 'Ej: Juan Pérez',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Ingresa tu nombre completo';
                }
                return null;
              },
            ),
          ],
          
          const SizedBox(height: 16),
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(
              labelText: 'Email *',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Ingresa tu email';
              }
              if (!value.contains('@')) {
                return 'Email inválido';
              }
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
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Ingresa tu teléfono';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 16),
          TextFormField(
            controller: _subdomainController,
            decoration: const InputDecoration(
              labelText: 'Subdominio (opcional)',
              hintText: 'mi-tienda',
              border: OutlineInputBorder(),
              suffixText: '.autodealers.com',
            ),
            onChanged: (value) {
              // Validar solo letras, números y guiones
              final cleaned = value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9-]'), '');
              if (cleaned != value) {
                _subdomainController.value = TextEditingValue(
                  text: cleaned,
                  selection: TextSelection.collapsed(offset: cleaned.length),
                );
              }
            },
          ),
          const SizedBox(height: 4),
          SelectableText(
            'Tu sitio web será: ${_subdomainController.text.isEmpty ? 'subdominio' : _subdomainController.text}.autodealers.com',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
          
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            decoration: const InputDecoration(
              labelText: 'Contraseña *',
              border: OutlineInputBorder(),
            ),
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Ingresa tu contraseña';
              }
              if (value.length < 6) {
                return 'La contraseña debe tener al menos 6 caracteres';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirmPasswordController,
            decoration: const InputDecoration(
              labelText: 'Confirmar contraseña *',
              border: OutlineInputBorder(),
            ),
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Confirma tu contraseña';
              }
              if (value != _passwordController.text) {
                return 'Las contraseñas no coinciden';
              }
              return null;
            },
          ),
          
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator()
                  : const Text('Crear cuenta'),
            ),
          ),
          
          const SizedBox(height: 16),
          Center(
            child: TextButton(
              onPressed: () => context.go('/login'),
              child: const SelectableText('¿Ya tienes cuenta? Inicia sesión aquí'),
            ),
          ),
        ],
      ),
    );
  }
}


