// Sección de Contacto - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/config/api_config.dart';
import 'contact_form_widget.dart';

class ContactSection extends StatelessWidget {
  const ContactSection({super.key});

  Future<void> _launchWhatsApp() async {
    final url = Uri.parse('https://wa.me/${kContactWhatsApp}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  Future<void> _launchPhone() async {
    final url = Uri.parse('tel:+${kContactPhone}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final formKey = GlobalKey<FormState>();
    
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 96, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.blue.shade50,
            Colors.purple.shade50,
            Colors.pink.shade50,
          ],
        ),
        border: const Border(top: BorderSide(color: Colors.grey, width: 1)),
      ),
      child: Column(
        children: [
          const Text(
            '¿Necesitas Ayuda?',
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 16),
          const SizedBox(
            width: 768,
            child: Text(
              'Nuestro equipo está listo para ayudarte a encontrar el vehículo perfecto',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey,
              ),
            ),
          ),
          const SizedBox(height: 48),
          
          // Cards de contacto
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 768 ? 3 : 1;
              
              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                childAspectRatio: 1.2,
                children: [
                  _ContactCard(
                    icon: Icons.chat_bubble_outline,
                    title: 'WhatsApp',
                    description: 'Escríbenos directamente',
                    onTap: _launchWhatsApp,
                  ),
                  _ContactCard(
                    icon: Icons.phone,
                    title: 'Llamada',
                    description: 'Llámanos ahora',
                    onTap: _launchPhone,
                  ),
                  _ContactCard(
                    icon: Icons.email_outlined,
                    title: 'Formulario',
                    description: 'Completa nuestro formulario',
                    onTap: () {
                      // Scroll al formulario - se manejará con el key del formulario
                    },
                  ),
                ],
              );
            },
          ),
          
          const SizedBox(height: 48),
          
          // Formulario de Contacto
          Container(
            key: formKey,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                const Text(
                  'Formulario de Contacto',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 24),
                const ContactFormWidget(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactCard extends StatefulWidget {
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  const _ContactCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  @override
  State<_ContactCard> createState() => _ContactCardState();
}

class _ContactCardState extends State<_ContactCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.grey.shade900,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(_isHovered ? 0.3 : 0.2),
                blurRadius: _isHovered ? 12 : 8,
                offset: Offset(0, _isHovered ? 6 : 4),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  widget.icon,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                widget.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                widget.description,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


