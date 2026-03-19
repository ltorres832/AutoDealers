// Sección de Confianza y Garantías - Replica exacta de Next.js
import 'package:flutter/material.dart';

class TrustSection extends StatelessWidget {
  const TrustSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 96, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white,
            Colors.grey.shade50,
          ],
        ),
        border: const Border(
          top: BorderSide(color: Colors.blue, width: 4),
        ),
      ),
      child: Stack(
        children: [
          // Background decorativo
          Positioned.fill(
            child: Opacity(
              opacity: 0.05,
              child: Stack(
                children: [
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      width: 384,
                      height: 384,
                      decoration: BoxDecoration(
                        color: Colors.blue.shade600,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 384,
                      height: 384,
                      decoration: BoxDecoration(
                        color: Colors.purple.shade600,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Contenido
          Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade600,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'GARANTÍA TOTAL',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              RichText(
                textAlign: TextAlign.center,
                text: const TextSpan(
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w900,
                    color: Colors.grey,
                  ),
                  children: [
                    TextSpan(text: '¿Por Qué '),
                    TextSpan(
                      text: 'Elegirnos',
                      style: TextStyle(color: Colors.blue),
                    ),
                    TextSpan(text: '?'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const SizedBox(
                width: 768,
                child: Text(
                  'La plataforma más confiable y segura para comprar tu vehículo. Cada transacción está respaldada por nuestras garantías.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    color: Colors.grey,
                  ),
                ),
              ),
              const SizedBox(height: 64),
              
              // Cards de características
              LayoutBuilder(
                builder: (context, constraints) {
                  final crossAxisCount = constraints.maxWidth > 1024 
                      ? 4 
                      : constraints.maxWidth > 768 
                          ? 2 
                          : 1;
                  
                  return GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 32,
                    mainAxisSpacing: 32,
                    childAspectRatio: 0.85,
                    children: [
                      _TrustCard(
                        icon: Icons.search,
                        title: 'Búsqueda Avanzada',
                        description: 'Filtros inteligentes y búsqueda por múltiples criterios para encontrar exactamente lo que buscas',
                        feature: 'Filtros Inteligentes',
                        color: Colors.blue,
                      ),
                      _TrustCard(
                        icon: Icons.chat_bubble_outline,
                        title: 'Chat en Tiempo Real',
                        description: 'Comunicación directa con dealers y vendedores a través de WhatsApp y mensajería integrada',
                        feature: 'Comunicación Directa',
                        color: Colors.green,
                      ),
                      _TrustCard(
                        icon: Icons.people_outline,
                        title: 'Gestión de Leads',
                        description: 'Sistema CRM integrado para seguimiento profesional de tus consultas y solicitudes',
                        feature: 'CRM Integrado',
                        color: Colors.purple,
                      ),
                      _TrustCard(
                        icon: Icons.bar_chart,
                        title: 'Reportes y Analytics',
                        description: 'Estadísticas detalladas de inventario, ventas y rendimiento para dealers y vendedores',
                        feature: 'Analytics Avanzado',
                        color: Colors.amber,
                      ),
                    ],
                  );
                },
              ),
              
              const SizedBox(height: 64),
              
              // Badges de confianza
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade600, Colors.purple.shade600],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _StatBadge(value: '10,000+', label: 'Clientes Satisfechos'),
                    Container(
                      width: 1,
                      height: 60,
                      color: Colors.white.withOpacity(0.2),
                    ),
                    _StatBadge(value: '4.9/5', label: 'Calificación Promedio'),
                    Container(
                      width: 1,
                      height: 60,
                      color: Colors.white.withOpacity(0.2),
                    ),
                    _StatBadge(value: '99.8%', label: 'Tasa de Satisfacción'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TrustCard extends StatefulWidget {
  final IconData icon;
  final String title;
  final String description;
  final String feature;
  final Color color;

  const _TrustCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.feature,
    required this.color,
  });

  @override
  State<_TrustCard> createState() => _TrustCardState();
}

class _TrustCardState extends State<_TrustCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _isHovered ? widget.color : widget.color.withOpacity(0.2),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(_isHovered ? 0.2 : 0.1),
              blurRadius: _isHovered ? 24 : 8,
              offset: Offset(0, _isHovered ? 8 : 4),
            ),
          ],
        ),
        transform: Matrix4.identity()..translate(0.0, _isHovered ? -8.0 : 0.0),
        child: Column(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    widget.color,
                    widget.color.withOpacity(0.8),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: widget.color.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(
                widget.icon,
                color: Colors.white,
                size: 40,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              widget.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              widget.description,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '✓',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: widget.color,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  widget.feature,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String value;
  final String label;

  const _StatBadge({
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 48,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w500,
            color: Colors.white.withOpacity(0.9),
          ),
        ),
      ],
    );
  }
}


