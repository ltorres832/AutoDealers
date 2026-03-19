// Drawer del Dealer - menú lateral con todas las rutas /dealer/*
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DealerDrawer extends StatelessWidget {
  const DealerDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade700, Colors.purple.shade600],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Text(
                  'AutoDealers',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Concesionario',
                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14),
                ),
              ],
            ),
          ),
          _Tile(icon: Icons.dashboard, label: 'Dashboard', path: '/dealer/dashboard', current: path),
          _Tile(icon: Icons.people, label: 'Leads', path: '/dealer/leads', current: path),
          _Tile(icon: Icons.view_kanban, label: 'Leads Kanban', path: '/dealer/leads/kanban', current: path),
          _Tile(icon: Icons.directions_car, label: 'Inventario', path: '/dealer/inventory', current: path),
          _Tile(icon: Icons.message, label: 'Mensajes', path: '/dealer/messages', current: path),
          _Tile(icon: Icons.calendar_today, label: 'Citas', path: '/dealer/appointments', current: path),
          _Tile(icon: Icons.bar_chart, label: 'Estadísticas ventas', path: '/dealer/sales-statistics', current: path),
          _Tile(icon: Icons.assessment, label: 'Informes', path: '/dealer/reports', current: path),
          _Tile(icon: Icons.task_alt, label: 'Tareas', path: '/dealer/tasks', current: path),
          _Tile(icon: Icons.account_tree, label: 'Workflows', path: '/dealer/workflows', current: path),
          _Tile(icon: Icons.campaign, label: 'Campañas', path: '/dealer/campaigns', current: path),
          _Tile(icon: Icons.local_offer, label: 'Promociones', path: '/dealer/promotions', current: path),
          _Tile(icon: Icons.view_carousel, label: 'Banners', path: '/dealer/banners', current: path),
          _Tile(icon: Icons.description, label: 'Contratos', path: '/dealer/contracts', current: path),
          _Tile(icon: Icons.folder, label: 'Archivos cliente', path: '/dealer/customer-files', current: path),
          _Tile(icon: Icons.request_quote, label: 'FI', path: '/dealer/fi', current: path),
          _Tile(icon: Icons.star, label: 'Reviews', path: '/dealer/reviews', current: path),
          _Tile(icon: Icons.card_giftcard, label: 'Referrals', path: '/dealer/referrals', current: path),
          _Tile(icon: Icons.notifications_active, label: 'Recordatorios', path: '/dealer/reminders', current: path),
          _Tile(icon: Icons.chat, label: 'Chat interno', path: '/dealer/internal-chat', current: path),
          _Tile(icon: Icons.forum, label: 'Chat público', path: '/dealer/public-chat', current: path),
          _Tile(icon: Icons.share, label: 'Redes sociales', path: '/dealer/social-posts', current: path),
          _Tile(icon: Icons.campaign_outlined, label: 'Anuncios', path: '/dealer/announcements', current: path),
          _Tile(icon: Icons.person, label: 'Vendedores', path: '/dealer/sellers', current: path),
          _Tile(icon: Icons.people_outline, label: 'Usuarios', path: '/dealer/users', current: path),
          _Tile(icon: Icons.store, label: 'Dealers', path: '/dealer/dealers', current: path),
          const Divider(),
          _Tile(icon: Icons.settings, label: 'Ajustes', path: '/dealer/settings', current: path),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String path;
  final String current;

  const _Tile({required this.icon, required this.label, required this.path, required this.current});

  @override
  Widget build(BuildContext context) {
    final isSelected = current == path || (path.length > 1 && current.startsWith(path));
    return ListTile(
      leading: Icon(icon, color: isSelected ? Theme.of(context).colorScheme.primary : null),
      title: Text(label, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : null)),
      selected: isSelected,
      onTap: () {
        Navigator.of(context).pop();
        if (!isSelected) context.go(path);
      },
    );
  }
}


