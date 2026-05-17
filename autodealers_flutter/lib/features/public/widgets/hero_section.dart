// Hero Section con búsqueda
import 'package:flutter/material.dart';
import 'hero_search_widget.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F172A), // slate-900
            Color(0xFF1E293B), // slate-800
            Color(0xFF0F172A), // slate-900
          ],
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.only(top: 120, bottom: 80),
        child: Column(
          children: [
            // Badge de Confianza
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: Colors.white.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle, color: Color(0xFF4ADE80), size: 20), // green-400
                  const SizedBox(width: 8),
                  const Text(
                    'Más de 100 vehículos verificados',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 16),
                  Container(width: 1, height: 16, color: Colors.white.withOpacity(0.3)),
                  const SizedBox(width: 16),
                  const Icon(Icons.verified, color: Color(0xFF60A5FA), size: 20), // blue-400
                  const SizedBox(width: 8),
                  const Text(
                    '100% Garantizado',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            
            // Título Principal
            const Text(
              'Encuentra tu\nvehículo perfecto',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 64,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 24),
            
            // Subtítulo
            const Text(
              'La plataforma más confiable para comprar y vender vehículos',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                color: Colors.white70,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Financiamiento aprobado • Garantías verificadas • Transacciones 100% seguras',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white60,
              ),
            ),
            const SizedBox(height: 48),
            
            // Hero Search
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const HeroSearchWidget(),
              ),
            ),
            const SizedBox(height: 48),
            
            // Estadísticas
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _StatCard(
                    icon: Icons.verified_user,
                    value: '100+',
                    label: 'Vehículos Verificados',
                    color: Colors.blue,
                  ),
                  _StatCard(
                    icon: Icons.store,
                    value: '50+',
                    label: 'Concesionarios Certificados',
                    color: Colors.purple,
                  ),
                  _StatCard(
                    icon: Icons.check_circle,
                    value: 'Disponible',
                    label: 'Garantía Incluida',
                    color: Colors.green,
                  ),
                  _StatCard(
                    icon: Icons.support_agent,
                    value: 'Disponible',
                    label: 'Soporte Disponible',
                    color: Colors.amber,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color, color.withOpacity(0.8)],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 32),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withOpacity(0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}


