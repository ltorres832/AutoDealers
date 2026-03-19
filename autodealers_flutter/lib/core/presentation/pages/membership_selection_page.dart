// Página de Selección de Membresía
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class MembershipSelectionPage extends StatefulWidget {
  final String? accountType;
  final String? userId;
  final bool registered;

  const MembershipSelectionPage({
    super.key,
    this.accountType,
    this.userId,
    this.registered = false,
  });

  @override
  State<MembershipSelectionPage> createState() => _MembershipSelectionPageState();
}

class _MembershipSelectionPageState extends State<MembershipSelectionPage> {
  List<dynamic> _memberships = [];
  bool _isLoading = true;
  String? _error;
  String? _selectedMembershipId;

  @override
  void initState() {
    super.initState();
    _loadMemberships();
    if (widget.registered) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: SelectableText('¡Cuenta creada exitosamente! Ahora selecciona tu plan.'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 5),
          ),
        );
      });
    }
  }

  Future<void> _loadMemberships() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3000/api/public/memberships?type=${widget.accountType ?? 'dealer'}${widget.userId != null ? '&userId=${widget.userId}' : ''}'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _memberships = data['memberships'] ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Error al cargar membresías';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error al conectar con el servidor: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _handleSelectMembership(String membershipId) async {
    setState(() => _selectedMembershipId = membershipId);
    
    // Aquí se integraría con Stripe para procesar el pago
    // Por ahora, solo mostramos un mensaje
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: SelectableText('Integración con Stripe pendiente. Redirigiendo al login...'),
          duration: Duration(seconds: 3),
        ),
      );
      
      // Redirigir al login después de unos segundos
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          context.go('/login?registered=true');
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SelectionArea(
      child: Scaffold(
        backgroundColor: Colors.grey.shade100,
        appBar: AppBar(
          title: const SelectableText('Selecciona tu Plan'),
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: SizedBox(
                width: 1000,
                child: Column(
                  children: [
                    const SelectableText(
                      'Elige tu plan de membresía',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const SelectableText(
                      'Selecciona el plan que mejor se adapte a tus necesidades',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                    const SizedBox(height: 32),
                    
                    if (_isLoading)
                      const CircularProgressIndicator()
                    else if (_error != null)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          border: Border.all(color: Colors.red.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: SelectableText(
                          _error!,
                          style: TextStyle(color: Colors.red.shade900),
                        ),
                      )
                    else if (_memberships.isEmpty)
                      const SelectableText('No hay planes disponibles en este momento.')
                    else
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          childAspectRatio: 0.75,
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
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMembershipCard(Map<String, dynamic> membership, bool isPopular, bool isSelected) {
    final features = membership['features'] ?? {};
    final limits = <String>[];
    
    if (features['maxSellers'] != null) {
      limits.add('👥 ${features['maxSellers']} Vendedores');
    } else if (features['maxSellers'] == null) {
      limits.add('👥 Vendedores Ilimitados');
    }
    
    if (features['maxInventory'] != null) {
      limits.add('🚗 ${features['maxInventory']} Vehículos');
    } else if (features['maxInventory'] == null) {
      limits.add('🚗 Inventario Ilimitado');
    }

    final featureList = <String>[];
    if (features['customSubdomain'] == true) featureList.add('🌐 Página Web con Subdominio');
    if (features['crmAdvanced'] == true) featureList.add('📊 CRM Completo');
    if (features['socialMediaEnabled'] == true) featureList.add('📱 Publicaciones en Redes Sociales');
    if (features['videoUploads'] == true) featureList.add('🎥 Subida de Videos');
    if (features['liveChat'] == true) featureList.add('💬 Chat en Vivo');
    if (features['appointmentScheduling'] == true) featureList.add('📅 Sistema de Citas');

    return InkWell(
      onTap: () => _handleSelectMembership(membership['id']),
      child: Container(
        padding: const EdgeInsets.all(20),
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
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            SelectableText(
              membership['type'] == 'dealer' ? 'Para Concesionarios' : 'Para Vendedores',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SelectableText(
                  '\$${membership['price'] ?? 0}',
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 4),
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: SelectableText(
                    '/${membership['billingCycle'] == 'monthly' ? 'mes' : 'año'}',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (limits.isNotEmpty) ...[
              const SelectableText(
                '📊 Límites:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              ...limits.map((limit) => Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: SelectableText(
                  limit,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                ),
              )),
              const SizedBox(height: 12),
            ],
            if (featureList.isNotEmpty) ...[
              const SelectableText(
                '✅ Incluye:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              ...featureList.map((feature) => Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Row(
                  children: [
                    const Icon(Icons.check, color: Colors.green, size: 12),
                    const SizedBox(width: 4),
                    Expanded(
                      child: SelectableText(
                        feature,
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                      ),
                    ),
                  ],
                ),
              )),
            ],
            const Spacer(),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _handleSelectMembership(membership['id']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isSelected ? Colors.blue : Colors.grey.shade300,
                  foregroundColor: isSelected ? Colors.white : Colors.black,
                ),
                child: const Text('Seleccionar Plan'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


