import 'package:flutter/material.dart';
import '../models/user_role.dart';
import '../services/auth_service.dart';

/// Navegación basada en roles
class RoleBasedNavigation {
  /// Obtiene las rutas de navegación según el rol
  static List<NavigationItem> getNavigationItems(Permissions? permissions) {
    if (permissions == null) return [];

    switch (permissions.role) {
      case UserRole.admin:
        return _getAdminNavigation();
      case UserRole.dealer:
        return _getDealerNavigation();
      case UserRole.seller:
        return _getSellerNavigation();
    }
  }

  /// Navegación para Admin
  static List<NavigationItem> _getAdminNavigation() {
    return [
      NavigationItem(
        label: 'Vista Global',
        icon: Icons.dashboard,
        route: '/admin/global',
        permission: (p) => p.role == UserRole.admin,
      ),
      NavigationItem(
        label: 'Usuarios',
        icon: Icons.people,
        route: '/admin/users',
        permission: (p) => p.role == UserRole.admin,
      ),
      NavigationItem(
        label: 'Tenants',
        icon: Icons.business,
        route: '/admin/tenants',
        permission: (p) => p.canManageTenants,
      ),
      NavigationItem(
        label: 'Membresías',
        icon: Icons.card_membership,
        route: '/admin/memberships',
        permission: (p) => p.canManageMemberships,
      ),
      NavigationItem(
        label: 'Suscripciones',
        icon: Icons.subscriptions,
        route: '/admin/subscriptions',
        permission: (p) => p.canManageMemberships,
      ),
      NavigationItem(
        label: 'Features Dinámicas',
        icon: Icons.auto_awesome,
        route: '/admin/dynamic-features',
        permission: (p) => p.canManageDynamicFeatures,
      ),
      NavigationItem(
        label: 'Templates',
        icon: Icons.description,
        route: '/admin/communication-templates',
        permission: (p) => p.canManageCommunicationTemplates,
      ),
      NavigationItem(
        label: 'Todos los Leads',
        icon: Icons.phone,
        route: '/admin/all-leads',
        permission: (p) => p.canViewAllLeads,
      ),
      NavigationItem(
        label: 'Todos los Vehículos',
        icon: Icons.directions_car,
        route: '/admin/all-vehicles',
        permission: (p) => p.canViewAllVehicles,
      ),
      NavigationItem(
        label: 'Todas las Ventas',
        icon: Icons.attach_money,
        route: '/admin/all-sales',
        permission: (p) => p.canViewAllSales,
      ),
      NavigationItem(
        label: 'Todas las Campañas',
        icon: Icons.campaign,
        route: '/admin/all-campaigns',
        permission: (p) => p.canViewAllCampaigns,
      ),
      NavigationItem(
        label: 'Todas las Promociones',
        icon: Icons.local_offer,
        route: '/admin/all-promotions',
        permission: (p) => p.canViewAllPromotions,
      ),
      NavigationItem(
        label: 'Todas las Reseñas',
        icon: Icons.star,
        route: '/admin/reviews',
        permission: (p) => p.canViewAllReviews,
      ),
      NavigationItem(
        label: 'Todas las Integraciones',
        icon: Icons.link,
        route: '/admin/all-integrations',
        permission: (p) => p.canViewAllIntegrations,
      ),
      NavigationItem(
        label: 'Configuración',
        icon: Icons.settings,
        route: '/admin/settings',
        permission: (p) => p.role == UserRole.admin,
      ),
      NavigationItem(
        label: 'Logs',
        icon: Icons.list_alt,
        route: '/admin/logs',
        permission: (p) => p.canViewLogs,
      ),
    ];
  }

  /// Navegación para Dealer
  static List<NavigationItem> _getDealerNavigation() {
    return [
      NavigationItem(
        label: 'Dashboard',
        icon: Icons.dashboard,
        route: '/dashboard',
        permission: (p) => true,
      ),
      NavigationItem(
        label: 'Leads',
        icon: Icons.phone,
        route: '/leads',
        permission: (p) => p.canManageLeads,
      ),
      NavigationItem(
        label: 'Inventario',
        icon: Icons.directions_car,
        route: '/inventory',
        permission: (p) => p.canManageInventory,
      ),
      NavigationItem(
        label: 'Vendedores',
        icon: Icons.people,
        route: '/sellers',
        permission: (p) => p.canManageSellers,
      ),
      NavigationItem(
        label: 'Actividad Vendedores',
        icon: Icons.analytics,
        route: '/sellers/activity',
        permission: (p) => p.canViewSellerActivity,
      ),
      NavigationItem(
        label: 'Dealers',
        icon: Icons.business,
        route: '/dealers',
        permission: (p) => p.canManageDealers,
      ),
      NavigationItem(
        label: 'Usuarios Gestores',
        icon: Icons.admin_panel_settings,
        route: '/users',
        permission: (p) => p.canManageAdminUsers,
      ),
      NavigationItem(
        label: 'Campañas',
        icon: Icons.campaign,
        route: '/campaigns',
        permission: (p) => p.canManageCampaigns,
      ),
      NavigationItem(
        label: 'Promociones',
        icon: Icons.local_offer,
        route: '/promotions',
        permission: (p) => p.canManagePromotions,
      ),
      NavigationItem(
        label: 'Mensajes',
        icon: Icons.message,
        route: '/messages',
        permission: (p) => p.canManageMessages,
      ),
      NavigationItem(
        label: 'Chat Interno',
        icon: Icons.chat_bubble,
        route: '/internal-chat',
        permission: (p) => p.canManageMessages,
      ),
      NavigationItem(
        label: 'Chat Público',
        icon: Icons.public,
        route: '/public-chat',
        permission: (p) => p.canManageMessages,
      ),
      NavigationItem(
        label: 'Citas',
        icon: Icons.calendar_today,
        route: '/appointments',
        permission: (p) => p.canManageAppointments,
      ),
      NavigationItem(
        label: 'Recordatorios',
        icon: Icons.alarm,
        route: '/reminders',
        permission: (p) => p.canViewReminders,
      ),
      NavigationItem(
        label: 'Reseñas',
        icon: Icons.star,
        route: '/reviews',
        permission: (p) => p.canManageReviews,
      ),
      NavigationItem(
        label: 'Casos de Cliente',
        icon: Icons.folder,
        route: '/customer-files',
        permission: (p) => p.canManageCustomerFiles,
      ),
      NavigationItem(
        label: 'Estadísticas de Ventas',
        icon: Icons.bar_chart,
        route: '/sales-statistics',
        permission: (p) => p.canManageSales,
      ),
      NavigationItem(
        label: 'Reportes',
        icon: Icons.assessment,
        route: '/reports',
        permission: (p) => p.canViewReports,
      ),
      NavigationItem(
        label: 'Configuración',
        icon: Icons.settings,
        route: '/settings',
        permission: (p) => p.canManageSettings,
      ),
    ];
  }

  /// Navegación para Seller
  static List<NavigationItem> _getSellerNavigation() {
    return [
      NavigationItem(
        label: 'Dashboard',
        icon: Icons.dashboard,
        route: '/dashboard',
        permission: (p) => true,
      ),
      NavigationItem(
        label: 'Leads',
        icon: Icons.phone,
        route: '/leads',
        permission: (p) => p.canManageLeads,
      ),
      NavigationItem(
        label: 'Inventario',
        icon: Icons.directions_car,
        route: '/inventory',
        permission: (p) => p.canManageInventory,
      ),
      NavigationItem(
        label: 'Mensajes',
        icon: Icons.message,
        route: '/messages',
        permission: (p) => p.canManageMessages,
      ),
      NavigationItem(
        label: 'Chat Interno',
        icon: Icons.chat_bubble,
        route: '/internal-chat',
        permission: (p) => p.canManageMessages,
      ),
      NavigationItem(
        label: 'Chat Público',
        icon: Icons.public,
        route: '/public-chat',
        permission: (p) => p.canManageMessages,
      ),
      NavigationItem(
        label: 'Citas',
        icon: Icons.calendar_today,
        route: '/appointments',
        permission: (p) => p.canManageAppointments,
      ),
      NavigationItem(
        label: 'Campañas',
        icon: Icons.campaign,
        route: '/campaigns',
        permission: (p) => p.canManageCampaigns,
      ),
      NavigationItem(
        label: 'Promociones',
        icon: Icons.local_offer,
        route: '/promotions',
        permission: (p) => p.canManagePromotions,
      ),
      NavigationItem(
        label: 'Reseñas',
        icon: Icons.star,
        route: '/reviews',
        permission: (p) => p.canManageReviews,
      ),
      NavigationItem(
        label: 'Casos de Cliente',
        icon: Icons.folder,
        route: '/customer-files',
        permission: (p) => p.canManageCustomerFiles,
      ),
      NavigationItem(
        label: 'Estadísticas de Ventas',
        icon: Icons.bar_chart,
        route: '/sales-statistics',
        permission: (p) => p.canManageSales,
      ),
      NavigationItem(
        label: 'Reportes',
        icon: Icons.assessment,
        route: '/reports',
        permission: (p) => p.canViewReports,
      ),
      NavigationItem(
        label: 'Usuarios',
        icon: Icons.people,
        route: '/users',
        permission: (p) => p.canManageSubUsers,
      ),
      NavigationItem(
        label: 'Configuración',
        icon: Icons.settings,
        route: '/settings',
        permission: (p) => p.canManageSettings,
      ),
    ];
  }
}

/// Item de navegación
class NavigationItem {
  final String label;
  final IconData icon;
  final String route;
  final bool Function(Permissions) permission;

  NavigationItem({
    required this.label,
    required this.icon,
    required this.route,
    required this.permission,
  });
}

