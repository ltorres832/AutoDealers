import 'package:go_router/go_router.dart';
import '../../features/auth/pages/login_page.dart';
import '../../features/dashboard/pages/dashboard_page.dart';
import '../../features/crm/pages/leads_page.dart';
import '../../features/crm/pages/leads_page.dart';
import '../../features/inventory/pages/inventory_page.dart';
import '../../features/messaging/pages/messages_page.dart';
import '../../features/appointments/pages/appointments_page.dart';
import '../../features/sales/pages/sales_page.dart';
import '../../features/sales/pages/sales_statistics_page.dart';
// import '../../features/settings/pages/settings_page.dart'; // TODO: Crear SettingsPage

/// Router completo con TODAS las rutas para Admin, Dealer y Seller
class AppRouterComplete {
  static GoRouter createRouter() {
    return GoRouter(
      initialLocation: '/login',
      routes: [
        // Autenticación
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginPage(),
        ),

        // ============ RUTAS COMUNES (Dealer y Seller) ============
        
        // Dashboard
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardPage(),
        ),

        // CRM - Leads
        GoRoute(
          path: '/leads',
          builder: (context, state) => const LeadsPage(),
        ),
        GoRoute(
          path: '/leads/:id',
          builder: (context, state) {
            // final leadId = state.pathParameters['id']!;
            // TODO: Implementar página de detalle de lead
            return const LeadsPage();
          },
        ),

        // Inventario
        GoRoute(
          path: '/inventory',
          builder: (context, state) => const InventoryPage(),
        ),

        // Ventas
        GoRoute(
          path: '/sales',
          builder: (context, state) => const SalesPage(),
        ),
        GoRoute(
          path: '/sales-statistics',
          builder: (context, state) => const SalesStatisticsPage(),
        ),

        // Citas
        GoRoute(
          path: '/appointments',
          builder: (context, state) => const AppointmentsPage(),
        ),

        // Mensajería
        GoRoute(
          path: '/messages',
          builder: (context, state) => const MessagesPage(),
        ),
        GoRoute(
          path: '/internal-chat',
          builder: (context, state) {
            // TODO: Implementar chat interno
            return const MessagesPage();
          },
        ),
        GoRoute(
          path: '/public-chat',
          builder: (context, state) {
            // TODO: Implementar chat público
            return const MessagesPage();
          },
        ),

        // Campañas
        GoRoute(
          path: '/campaigns',
          builder: (context, state) {
            // TODO: Implementar campañas
            return const DashboardPage();
          },
        ),

        // Promociones
        GoRoute(
          path: '/promotions',
          builder: (context, state) {
            // TODO: Implementar promociones
            return const DashboardPage();
          },
        ),

        // Recordatorios
        GoRoute(
          path: '/reminders',
          builder: (context, state) {
            // TODO: Implementar recordatorios
            return const DashboardPage();
          },
        ),

        // Reseñas
        GoRoute(
          path: '/reviews',
          builder: (context, state) {
            // TODO: Implementar reseñas
            return const DashboardPage();
          },
        ),

        // Archivos de Cliente
        GoRoute(
          path: '/customer-files',
          builder: (context, state) {
            // TODO: Implementar archivos de cliente
            return const DashboardPage();
          },
        ),

        // Reportes
        GoRoute(
          path: '/reports',
          builder: (context, state) {
            // TODO: Implementar reportes
            return const DashboardPage();
          },
        ),

        // Configuración
        GoRoute(
          path: '/settings',
          builder: (context, state) => const DashboardPage(), // TODO: Implementar SettingsPage
          routes: [
            GoRoute(
              path: 'profile',
              builder: (context, state) {
                // TODO: Implementar perfil
                return const SettingsPage();
              },
            ),
            GoRoute(
              path: 'branding',
              builder: (context, state) {
                // TODO: Implementar branding
                return const SettingsPage();
              },
            ),
            GoRoute(
              path: 'website',
              builder: (context, state) {
                // TODO: Implementar configuración de website
                return const SettingsPage();
              },
            ),
            GoRoute(
              path: 'integrations',
              builder: (context, state) {
                // TODO: Implementar integraciones
                return const SettingsPage();
              },
            ),
            GoRoute(
              path: 'membership',
              builder: (context, state) {
                // TODO: Implementar membresía
                return const SettingsPage();
              },
            ),
            GoRoute(
              path: 'policies',
              builder: (context, state) {
                // TODO: Implementar políticas
                return const SettingsPage();
              },
            ),
            GoRoute(
              path: 'templates',
              builder: (context, state) {
                // TODO: Implementar plantillas
                return const SettingsPage();
              },
            ),
          ],
        ),

        // Usuarios
        GoRoute(
          path: '/users',
          builder: (context, state) {
            // TODO: Implementar gestión de usuarios
            return const DashboardPage();
          },
        ),

        // ============ RUTAS ESPECÍFICAS DE DEALER ============
        
        // Vendedores
        GoRoute(
          path: '/sellers',
          builder: (context, state) {
            // TODO: Implementar gestión de vendedores
            return const DashboardPage();
          },
        ),
        GoRoute(
          path: '/sellers/activity',
          builder: (context, state) {
            // TODO: Implementar actividad de vendedores
            return const DashboardPage();
          },
        ),

        // Dealers
        GoRoute(
          path: '/dealers',
          builder: (context, state) {
            // TODO: Implementar gestión de dealers
            return const DashboardPage();
          },
        ),

        // ============ RUTAS ESPECÍFICAS DE ADMIN ============
        
        // Vista Global
        GoRoute(
          path: '/admin/global',
          builder: (context, state) {
            // TODO: Implementar vista global de admin
            return const DashboardPage();
          },
        ),

        // Usuarios Admin
        GoRoute(
          path: '/admin/users',
          builder: (context, state) {
            // TODO: Implementar gestión de usuarios admin
            return const DashboardPage();
          },
        ),

        // Tenants
        GoRoute(
          path: '/admin/tenants',
          builder: (context, state) {
            // TODO: Implementar gestión de tenants
            return const DashboardPage();
          },
        ),
        GoRoute(
          path: '/admin/tenants/:id',
          builder: (context, state) {
            // TODO: Implementar detalle de tenant
            return const DashboardPage();
          },
        ),

        // Membresías
        GoRoute(
          path: '/admin/memberships',
          builder: (context, state) {
            // TODO: Implementar gestión de membresías
            return const DashboardPage();
          },
        ),

        // Suscripciones
        GoRoute(
          path: '/admin/subscriptions',
          builder: (context, state) {
            // TODO: Implementar gestión de suscripciones
            return const DashboardPage();
          },
        ),

        // Features Dinámicas
        GoRoute(
          path: '/admin/dynamic-features',
          builder: (context, state) {
            // TODO: Implementar features dinámicas
            return const DashboardPage();
          },
        ),

        // Templates
        GoRoute(
          path: '/admin/communication-templates',
          builder: (context, state) {
            // TODO: Implementar templates de comunicación
            return const DashboardPage();
          },
        ),

        // Todos los Leads
        GoRoute(
          path: '/admin/all-leads',
          builder: (context, state) {
            // TODO: Implementar todos los leads
            return const LeadsPage();
          },
        ),

        // Todos los Vehículos
        GoRoute(
          path: '/admin/all-vehicles',
          builder: (context, state) {
            // TODO: Implementar todos los vehículos
            return const InventoryPage();
          },
        ),

        // Todas las Ventas
        GoRoute(
          path: '/admin/all-sales',
          builder: (context, state) {
            // TODO: Implementar todas las ventas
            return const DashboardPage();
          },
        ),

        // Todas las Campañas
        GoRoute(
          path: '/admin/all-campaigns',
          builder: (context, state) {
            // TODO: Implementar todas las campañas
            return const DashboardPage();
          },
        ),

        // Todas las Promociones
        GoRoute(
          path: '/admin/all-promotions',
          builder: (context, state) {
            // TODO: Implementar todas las promociones
            return const DashboardPage();
          },
        ),

        // Todas las Reseñas
        GoRoute(
          path: '/admin/reviews',
          builder: (context, state) {
            // TODO: Implementar todas las reseñas
            return const DashboardPage();
          },
        ),

        // Todas las Integraciones
        GoRoute(
          path: '/admin/all-integrations',
          builder: (context, state) {
            // TODO: Implementar todas las integraciones
            return const DashboardPage();
          },
        ),

        // Configuración Admin
        GoRoute(
          path: '/admin/settings',
          builder: (context, state) {
            // TODO: Implementar configuración admin
            return const SettingsPage();
          },
        ),

        // Logs
        GoRoute(
          path: '/admin/logs',
          builder: (context, state) {
            // TODO: Implementar logs
            return const DashboardPage();
          },
        ),
      ],
      redirect: (context, state) {
        // TODO: Verificar autenticación y permisos
        return null;
      },
    );
  }
}

