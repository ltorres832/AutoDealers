// Página de Login
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../domain/models/user.dart' as app_models;

class LoginPage extends StatefulWidget {
  final String? redirectTo;
  final bool registered;

  const LoginPage({
    super.key,
    this.redirectTo,
    this.registered = false,
  });

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Mostrar mensaje de éxito si viene de registro
    if (widget.registered) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: SelectableText('¡Registro exitoso! Ahora puedes iniciar sesión.'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 5),
          ),
        );
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Redirigir según el rol del usuario
  void _redirectByRole(app_models.UserRole role) {
    // Si hay un redirect específico, usarlo primero
    if (widget.redirectTo != null && widget.redirectTo!.isNotEmpty) {
      context.go(widget.redirectTo!);
      return;
    }

    // Redirigir según el rol
    switch (role) {
      case app_models.UserRole.admin:
        context.go('/admin/dashboard');
        break;
      case app_models.UserRole.dealer:
        context.go('/dashboard');
        break;
      case app_models.UserRole.seller:
        context.go('/dashboard');
        break;
      default:
        // Rol no reconocido, ir a dashboard genérico
        context.go('/dashboard');
    }
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    
    final success = await authProvider.signIn(
      _emailController.text.trim(),
      _passwordController.text,
    );
    
    if (mounted) {
      if (success) {
        final user = authProvider.user;
        if (user != null) {
          // Redirigir según el rol
          _redirectByRole(user.role);
        } else {
          // Fallback a dashboard genérico
          context.go('/dashboard');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: SelectableText('Error: ${authProvider.error}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 10),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    print('LoginPage: Building widget - ${DateTime.now()}');
    return SelectionArea(
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Center(
            child: SizedBox(
              width: 400,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SelectableText(
                          'AutoDealers',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const SelectableText(
                          'Accede a tu cuenta. El sistema detectará automáticamente tu tipo de usuario',
                          style: TextStyle(fontSize: 14, color: Colors.grey),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),
                        TextFormField(
                          controller: _emailController,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.emailAddress,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Ingresa tu email';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordController,
                          decoration: const InputDecoration(
                            labelText: 'Contraseña',
                            border: OutlineInputBorder(),
                          ),
                          obscureText: true,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Ingresa tu contraseña';
                            }
                            return null;
                          },
                        ),
                      const SizedBox(height: 24),
                      Consumer<AuthProvider>(
                        builder: (context, authProvider, _) {
                          return Column(
                            children: [
                              if (authProvider.error != null)
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
                                    authProvider.error!,
                                    style: TextStyle(
                                      color: Colors.red.shade900,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: authProvider.isLoading ? null : _handleLogin,
                                  child: authProvider.isLoading
                                      ? const CircularProgressIndicator()
                                      : const Text('Iniciar Sesión'),
                                ),
                              ),
                              const SizedBox(height: 16),
                              const SelectableText(
                                '¿No tienes cuenta?',
                                style: TextStyle(fontSize: 14, color: Colors.grey),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  TextButton(
                                    onPressed: () => context.go('/register?type=dealer'),
                                    child: const SelectableText(
                                      'Regístrate como Dealer',
                                      style: TextStyle(fontSize: 14),
                                    ),
                                  ),
                                  const SelectableText(' | ', style: TextStyle(color: Colors.grey)),
                                  TextButton(
                                    onPressed: () => context.go('/register?type=seller'),
                                    child: const SelectableText(
                                      'Regístrate como Vendedor',
                                      style: TextStyle(fontSize: 14),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              TextButton(
                                onPressed: () => context.go('/'),
                                child: const SelectableText('Ir a la página pública (sin login)'),
                              ),
                            ],
                          );
                        },
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
    );
  }
}


