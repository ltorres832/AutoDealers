// Drawer del Seller - menú lateral con todas las rutas /seller/*
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SellerDrawer extends StatelessWidget {
  const SellerDrawer({super.key});

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
                colors: [Colors.indigo.shade700, Colors.cyan.shade600],
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
                  'Vendedor',
                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14),
                ),
              ],
            ),
          ),
          _Tile(icon: Icons.dashboard, label: 'Dashboard', path: '/seller/dashboard', current: path),
          _Tile(icon: Icons.people, label: 'Leads', path: '/seller/leads', current: path),
          _Tile(icon: Icons.view_kanban, label: 'Leads Kanban', path: '/seller/leads/kanban', current: path),
          _Tile(icon: Icons.directions_car, label: 'Inventario', path: '/seller/inventory', current: path),
          _Tile(icon: Icons.message, label: 'Mensajes', path: '/seller/messages', current: path),
          _Tile(icon: Icons.calendar_today, label: 'Citas', path: '/seller/appointments', current: path),
          _Tile(icon: Icons.shopping_cart, label: 'Ventas', path: '/seller/sales', current: path),
          _Tile(icon: Icons.bar_chart, label: 'Estadísticas', path: '/seller/sales-statistics', current: path),
          _Tile(icon: Icons.assessment, label: 'Informes', path: '/seller/reports', current: path),
          _Tile(icon: Icons.task_alt, label: 'Tareas', path: '/seller/tasks', current: path),
          _Tile(icon: Icons.account_tree, label: 'Workflows', path: '/seller/workflows', current: path),
          _Tile(icon: Icons.campaign, label: 'Campañas', path: '/seller/campaigns', current: path),
          _Tile(icon: Icons.local_offer, label: 'Promociones', path: '/seller/promotions', current: path),
          _Tile(icon: Icons.view_carousel, label: 'Banners', path: '/seller/banners', current: path),
          _Tile(icon: Icons.description, label: 'Contratos', path: '/seller/contracts', current: path),
          _Tile(icon: Icons.folder, label: 'Archivos cliente', path: '/seller/customer-files', current: path),
          _Tile(icon: Icons.request_quote, label: 'FI', path: '/seller/fi', current: path),
          _Tile(icon: Icons.person, label: 'Clientes', path: '/seller/customers', current: path),
          _Tile(icon: Icons.star, label: 'Reviews', path: '/seller/reviews', current: path),
          _Tile(icon: Icons.card_giftcard, label: 'Referrals', path: '/seller/referrals', current: path),
          _Tile(icon: Icons.chat, label: 'Chat interno', path: '/seller/internal-chat', current: path),
          _Tile(icon: Icons.forum, label: 'Chat público', path: '/seller/public-chat', current: path),
          _Tile(icon: Icons.share, label: 'Redes sociales', path: '/seller/social-posts', current: path),
          _Tile(icon: Icons.people_outline, label: 'Usuarios', path: '/seller/users', current: path),
          const Divider(),
          _Tile(icon: Icons.settings, label: 'Ajustes', path: '/seller/settings', current: path),
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


