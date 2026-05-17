// Router principal de la aplicación
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../pages/login_page.dart';
import '../pages/dashboard_page.dart';
import '../../../features/crm/pages/leads_list_page.dart';
import '../../../features/crm/pages/lead_detail_page.dart';
import '../../../features/crm/pages/create_lead_page.dart';
import '../../../features/crm/pages/edit_lead_page.dart';
import '../../../features/inventory/pages/vehicles_list_page.dart';
import '../../../features/inventory/pages/vehicle_detail_page.dart';
import '../../../features/inventory/pages/create_vehicle_page.dart';
import '../../../features/inventory/pages/edit_vehicle_page.dart';
import '../../../features/messaging/pages/messages_page.dart';
import '../../../features/appointments/pages/appointments_list_page.dart';
import '../../../features/appointments/pages/create_appointment_page.dart';
import '../../../features/sales/pages/sales_list_page.dart';
import '../../../features/sales/pages/create_sale_page.dart';

// Admin pages
import '../../../features/admin/pages/users_page.dart';
import '../../../features/admin/pages/user_create_page.dart';
import '../../../features/admin/pages/tenants_page.dart';
import '../../../features/admin/pages/tenant_detail_page.dart';
import '../../../features/admin/pages/tenant_create_page.dart';
import '../../../features/admin/pages/tenant_edit_page.dart';
import '../../../features/admin/pages/memberships_page.dart';
import '../../../features/admin/pages/membership_edit_page.dart';
import '../../../features/admin/pages/membership_create_page.dart';
import '../../../features/admin/pages/subscriptions_page.dart';
import '../../../features/admin/pages/stripe_config_page.dart';
import '../../../features/admin/pages/tasks_page.dart';
import '../../../features/admin/pages/workflows_page.dart';
import '../../../features/admin/pages/campaigns_page.dart';
import '../../../features/admin/pages/campaign_create_page.dart';
import '../../../features/admin/pages/promotions_page.dart';
import '../../../features/admin/pages/promotion_create_page.dart';
import '../../../features/admin/pages/banners_page.dart';
import '../../../features/admin/pages/reports_page.dart';
import '../../../features/admin/pages/settings_page.dart';
import '../../../features/admin/pages/settings_general_page.dart';
import '../../../features/admin/pages/settings_integrations_page.dart';
import '../../../features/admin/pages/testimonials_page.dart';
import '../../../features/admin/pages/reviews_page.dart';
import '../../../features/admin/pages/faqs_page.dart';
import '../../../features/admin/pages/corporate_emails_page.dart';
import '../../../features/admin/pages/announcements_page.dart';
import '../../../features/admin/pages/policies_page.dart';
import '../../../features/admin/pages/email_aliases_page.dart';
import '../../../features/admin/pages/scoring_page.dart';
import '../../../features/admin/pages/segments_tags_page.dart';
import '../../../features/admin/pages/fi_page.dart';
import '../../../features/admin/pages/advertisers_page.dart';
import '../../../features/admin/pages/advertiser_detail_page.dart';
import '../../../features/admin/pages/sponsored_content_page.dart';
import '../../../features/admin/pages/public_chat_page.dart';
import '../../../features/admin/pages/referrals_page.dart';
import '../../../features/admin/pages/maintenance_page.dart';
import '../../../features/admin/pages/feature_flags_page.dart';
import '../../../features/admin/pages/pricing_config_page.dart';
import '../../../features/admin/pages/landing_config_page.dart';
import '../../../features/admin/pages/ai_config_page.dart';
import '../../../features/admin/pages/kpis_page.dart';
import '../../../features/admin/pages/global_stats_page.dart';
import '../../../features/admin/pages/all_leads_page.dart';
import '../../../features/admin/pages/all_leads_kanban_page.dart';
import '../../../features/admin/pages/all_vehicles_page.dart';
import '../../../features/admin/pages/multi_dealer_requests_page.dart';
import '../../../features/admin/pages/purchase_intents_page.dart';
import '../../../features/admin/pages/contract_templates_page.dart';
import '../../../features/admin/pages/placeholder_page.dart';
import '../../../features/admin/pages/sellers_page.dart';

// Dealer pages
import '../../../features/dealer/pages/dashboard_page.dart';
import '../../../features/dealer/pages/leads_page.dart';
import '../../../features/dealer/pages/leads_kanban_page.dart';
import '../../../features/dealer/pages/inventory_page.dart';
import '../../../features/dealer/pages/messages_page.dart';
import '../../../features/dealer/pages/appointments_page.dart';
import '../../../features/dealer/pages/sales_statistics_page.dart';
import '../../../features/dealer/pages/reports_page.dart';
import '../../../features/dealer/pages/tasks_page.dart';
import '../../../features/dealer/pages/workflows_page.dart';
import '../../../features/dealer/pages/campaigns_page.dart';
import '../../../features/dealer/pages/promotions_page.dart';
import '../../../features/dealer/pages/banners_page.dart';
import '../../../features/dealer/pages/contracts_page.dart';
import '../../../features/dealer/pages/customer_files_page.dart';
import '../../../features/dealer/pages/fi_page.dart';
import '../../../features/dealer/pages/fi_metrics_page.dart';
import '../../../features/dealer/pages/fi_workflows_page.dart';
import '../../../features/dealer/pages/reviews_page.dart';
import '../../../features/dealer/pages/referrals_page.dart';
import '../../../features/dealer/pages/reminders_page.dart';
import '../../../features/dealer/pages/internal_chat_page.dart';
import '../../../features/dealer/pages/public_chat_page.dart';
import '../../../features/dealer/pages/social_posts_page.dart';
import '../../../features/dealer/pages/announcements_page.dart';
import '../../../features/dealer/pages/sellers_page.dart';
import '../../../features/dealer/pages/seller_detail_page.dart';
import '../../../features/dealer/pages/seller_activity_page.dart';
import '../../../features/dealer/pages/users_page.dart';
import '../../../features/dealer/pages/dealers_page.dart';
import '../../../features/dealer/pages/settings_page.dart';

// Seller pages
import '../../../features/seller/pages/dashboard_page.dart';
import '../../../features/seller/pages/leads_page.dart';
import '../../../features/seller/pages/leads_kanban_page.dart';
import '../../../features/seller/pages/inventory_page.dart';
import '../../../features/seller/pages/messages_page.dart';
import '../../../features/seller/pages/appointments_page.dart';
import '../../../features/seller/pages/sales_page.dart';
import '../../../features/seller/pages/sales_statistics_page.dart';
import '../../../features/seller/pages/reports_page.dart';
import '../../../features/seller/pages/tasks_page.dart';
import '../../../features/seller/pages/workflows_page.dart';
import '../../../features/seller/pages/campaigns_page.dart';
import '../../../features/seller/pages/promotions_page.dart';
import '../../../features/seller/pages/banners_page.dart';
import '../../../features/seller/pages/contracts_page.dart';
import '../../../features/seller/pages/customer_files_page.dart';
import '../../../features/seller/pages/fi_page.dart';
import '../../../features/seller/pages/fi_request_page.dart';
import '../../../features/seller/pages/fi_client_new_page.dart';
import '../../../features/seller/pages/fi_client_request_page.dart';
import '../../../features/seller/pages/customers_page.dart';
import '../../../features/seller/pages/customer_detail_page.dart';
import '../../../features/seller/pages/reviews_page.dart';
import '../../../features/seller/pages/referrals_page.dart';
import '../../../features/seller/pages/internal_chat_page.dart';
import '../../../features/seller/pages/internal_chat_conversation_page.dart';
import '../../../features/seller/pages/public_chat_page.dart';
import '../../../features/seller/pages/public_chat_conversation_page.dart';
import '../../../features/seller/pages/social_posts_page.dart';
import '../../../features/seller/pages/users_page.dart';
import '../../../features/seller/pages/settings_page.dart';

// Advertiser pages
import '../../../features/advertiser/pages/dashboard_page.dart';
import '../../../features/advertiser/pages/ads_page.dart';
import '../../../features/advertiser/pages/ad_create_page.dart';
import '../../../features/advertiser/pages/ad_detail_page.dart';
import '../../../features/advertiser/pages/billing_page.dart';

// Public pages
import '../../../features/public/pages/home_page.dart';
import '../../../features/public/pages/vehicles_catalog_page.dart';
import '../../../features/public/pages/vehicle_detail_page.dart';
import '../../../features/public/pages/contact_page.dart';
import '../../../features/public/pages/compare_vehicles_page.dart';
import '../../../features/public/pages/public_privacidad_page.dart';
import '../../../features/public/pages/public_terminos_page.dart';
import '../../../features/public/pages/public_faq_page.dart';
import '../../../features/public/pages/public_precios_page.dart';
import '../../../features/public/pages/public_dealers_page.dart';
import '../../../features/public/pages/static_placeholder_page.dart';
import '../pages/register_page.dart';
import '../pages/membership_selection_page.dart';
import '../pages/registro_completo_page.dart';
import '../pages/multi_dealer_register_page.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/', // Iniciar en la página pública
    debugLogDiagnostics: true,
    errorBuilder: (context, state) {
      print('Router Error: ${state.error}');
      print('Router Location: ${state.uri}');
      return Scaffold(
        body: SelectionArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  SelectableText(
                    'Error de navegación',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    '${state.error}',
                    style: const TextStyle(fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    'Ubicación: ${state.uri}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Volver al Login'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) {
          print('Router: Building LoginPage at /login');
          final redirectTo = state.uri.queryParameters['redirect'];
          final registered = state.uri.queryParameters['registered'] == 'true';
          return LoginPage(
            redirectTo: redirectTo,
            registered: registered,
          );
        },
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) {
          final accountType = state.uri.queryParameters['type'];
          return RegisterPage(accountType: accountType);
        },
        routes: [
          GoRoute(
            path: 'membership',
            builder: (context, state) {
              final accountType = state.uri.queryParameters['type'];
              final userId = state.uri.queryParameters['userId'];
              final registered = state.uri.queryParameters['registered'] == 'true';
              return MembershipSelectionPage(
                accountType: accountType,
                userId: userId,
                registered: registered,
              );
            },
          ),
          GoRoute(
            path: 'multi-dealer',
            builder: (context, state) {
              final referralCode = state.uri.queryParameters['ref'];
              return MultiDealerRegisterPage(referralCode: referralCode);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/registro',
        builder: (context, state) {
          final redirectTo = state.uri.queryParameters['redirect'];
          final referralCode = state.uri.queryParameters['ref'];
          return RegistroCompletoPage(
            redirectTo: redirectTo,
            referralCode: referralCode,
          );
        },
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardPage(),
      ),
      // CRM Routes
      GoRoute(
        path: '/leads',
        builder: (context, state) => const LeadsListPage(),
        routes: [
          GoRoute(
            path: 'create',
            builder: (context, state) => const CreateLeadPage(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return LeadDetailPage(leadId: id);
            },
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return EditLeadPage(leadId: id);
                },
              ),
            ],
          ),
        ],
      ),
      // Inventory Routes
      GoRoute(
        path: '/vehicles',
        builder: (context, state) => const VehiclesListPage(),
        routes: [
          GoRoute(
            path: 'create',
            builder: (context, state) => const CreateVehiclePage(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return VehicleDetailPage(vehicleId: id);
            },
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return EditVehiclePage(vehicleId: id);
                },
              ),
            ],
          ),
        ],
      ),
      // Messaging Routes
      GoRoute(
        path: '/messages',
        builder: (context, state) {
          final leadId = state.uri.queryParameters['leadId'];
          return MessagesPage(leadId: leadId);
        },
      ),
      // Appointments Routes
      GoRoute(
        path: '/appointments',
        builder: (context, state) => const AppointmentsListPage(),
        routes: [
          GoRoute(
            path: 'create',
            builder: (context, state) {
              final leadId = state.uri.queryParameters['leadId'];
              final vehicleId = state.uri.queryParameters['vehicleId'];
              final type = state.uri.queryParameters['type'];
              return CreateAppointmentPage(
                leadId: leadId,
                vehicleId: vehicleId,
                appointmentTypeQuery: type,
              );
            },
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de cita'),
          ),
        ],
      ),
      // Sales Routes
      GoRoute(
        path: '/sales',
        builder: (context, state) => const SalesListPage(),
        routes: [
          GoRoute(
            path: 'create',
            builder: (context, state) {
              final vehicleId = state.uri.queryParameters['vehicleId'];
              final leadId = state.uri.queryParameters['leadId'];
              return CreateSalePage(vehicleId: vehicleId, leadId: leadId);
            },
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de venta'),
          ),
        ],
      ),
      // Admin Routes
      GoRoute(
        path: '/admin',
        redirect: (context, state) => '/admin/users',
        routes: [
          GoRoute(
            path: 'users',
            builder: (context, state) => const AdminUsersPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminUserCreatePage(),
              ),
            ],
          ),
          GoRoute(
            path: 'tenants',
            builder: (context, state) => const AdminTenantsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminTenantCreatePage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return AdminTenantDetailPage(tenantId: id);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return AdminTenantEditPage(tenantId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'memberships',
            builder: (context, state) => const AdminMembershipsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminMembershipCreatePage(),
              ),
              GoRoute(
                path: ':id/edit',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return AdminMembershipEditPage(membershipId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'subscriptions',
            builder: (context, state) => const AdminSubscriptionsPage(),
          ),
          GoRoute(
            path: 'stripe-config',
            builder: (context, state) => const AdminStripeConfigPage(),
          ),
          GoRoute(
            path: 'tasks',
            builder: (context, state) => const AdminTasksPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear tarea'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de tarea'),
              ),
            ],
          ),
          GoRoute(
            path: 'workflows',
            builder: (context, state) => const AdminWorkflowsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear workflow'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de workflow'),
              ),
            ],
          ),
          GoRoute(
            path: 'campaigns',
            builder: (context, state) => const AdminCampaignsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminCampaignCreatePage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de campaña'),
              ),
            ],
          ),
          GoRoute(
            path: 'promotions',
            builder: (context, state) => const AdminPromotionsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPromotionCreatePage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de promoción'),
              ),
            ],
          ),
          GoRoute(
            path: 'banners',
            builder: (context, state) => const AdminBannersPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear banner'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de banner'),
              ),
            ],
          ),
          GoRoute(
            path: 'reports',
            builder: (context, state) => const AdminReportsPage(),
          ),
          GoRoute(
            path: 'settings',
            builder: (context, state) => const AdminSettingsPage(),
            routes: [
              GoRoute(
                path: 'general',
                builder: (context, state) => const AdminSettingsGeneralPage(),
              ),
              GoRoute(
                path: 'integrations',
                builder: (context, state) => const AdminSettingsIntegrationsPage(),
              ),
              GoRoute(
                path: 'stripe',
                builder: (context, state) => const AdminStripeConfigPage(),
              ),
              GoRoute(
                path: 'ai-config',
                builder: (context, state) => const AdminAIConfigPage(),
              ),
              GoRoute(
                path: 'feature-flags',
                builder: (context, state) => const AdminFeatureFlagsPage(),
              ),
              GoRoute(
                path: 'pricing-config',
                builder: (context, state) => const AdminPricingConfigPage(),
              ),
              GoRoute(
                path: 'landing-config',
                builder: (context, state) => const AdminLandingConfigPage(),
              ),
              GoRoute(
                path: 'maintenance',
                builder: (context, state) => const AdminMaintenancePage(),
              ),
            ],
          ),
          GoRoute(
            path: 'testimonials',
            builder: (context, state) => const AdminTestimonialsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear testimonio'),
              ),
            ],
          ),
          GoRoute(
            path: 'reviews',
            builder: (context, state) => const AdminReviewsPage(),
          ),
          GoRoute(
            path: 'faqs',
            builder: (context, state) => const AdminFAQsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear FAQ'),
              ),
            ],
          ),
          GoRoute(
            path: 'corporate-emails',
            builder: (context, state) => const AdminCorporateEmailsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear email corporativo'),
              ),
            ],
          ),
          GoRoute(
            path: 'announcements',
            builder: (context, state) => const AdminAnnouncementsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear anuncio'),
              ),
            ],
          ),
          GoRoute(
            path: 'policies',
            builder: (context, state) => const AdminPoliciesPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear política'),
              ),
            ],
          ),
          GoRoute(
            path: 'email-aliases',
            builder: (context, state) => const AdminEmailAliasesPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear alias de email'),
              ),
            ],
          ),
          GoRoute(
            path: 'scoring',
            builder: (context, state) => const AdminScoringPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear regla de puntuación'),
              ),
            ],
          ),
          GoRoute(
            path: 'segments-tags',
            builder: (context, state) => const AdminSegmentsTagsPage(),
          ),
          GoRoute(
            path: 'fi',
            builder: (context, state) => const AdminFIPage(),
          ),
          GoRoute(
            path: 'advertisers',
            builder: (context, state) => const AdminAdvertisersPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear anunciante'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return AdminAdvertiserDetailPage(advertiserId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'sponsored-content',
            builder: (context, state) => const AdminSponsoredContentPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear contenido patrocinado'),
              ),
            ],
          ),
          GoRoute(
            path: 'public-chat',
            builder: (context, state) => const AdminPublicChatPage(),
          ),
          GoRoute(
            path: 'referrals',
            builder: (context, state) => const AdminReferralsPage(),
          ),
          GoRoute(
            path: 'maintenance',
            builder: (context, state) => const AdminMaintenancePage(),
          ),
          GoRoute(
            path: 'feature-flags',
            builder: (context, state) => const AdminFeatureFlagsPage(),
          ),
          GoRoute(
            path: 'pricing-config',
            builder: (context, state) => const AdminPricingConfigPage(),
          ),
          GoRoute(
            path: 'landing-config',
            builder: (context, state) => const AdminLandingConfigPage(),
          ),
          GoRoute(
            path: 'ai-config',
            builder: (context, state) => const AdminAIConfigPage(),
          ),
          GoRoute(
            path: 'kpis',
            builder: (context, state) => const AdminKPIsPage(),
          ),
          GoRoute(
            path: 'global-stats',
            builder: (context, state) => const AdminGlobalStatsPage(),
          ),
          GoRoute(
            path: 'all-leads',
            builder: (context, state) => const AdminAllLeadsPage(),
            routes: [
              GoRoute(
                path: 'kanban',
                builder: (context, state) => const AdminAllLeadsKanbanPage(),
              ),
            ],
          ),
          GoRoute(
            path: 'all-vehicles',
            builder: (context, state) => const AdminAllVehiclesPage(),
          ),
          GoRoute(
            path: 'multi-dealer-requests',
            builder: (context, state) => const AdminMultiDealerRequestsPage(),
          ),
          GoRoute(
            path: 'purchase-intents',
            builder: (context, state) => const AdminPurchaseIntentsPage(),
          ),
          GoRoute(
            path: 'contract-templates',
            builder: (context, state) => const AdminContractTemplatesPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear plantilla de contrato'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle plantilla de contrato'),
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) => const AdminPlaceholderPage(title: 'Editar plantilla de contrato'),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'sellers',
            builder: (context, state) => const AdminSellersPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear vendedor'),
              ),
            ],
          ),
        ],
      ),
      // Dealer Routes
      GoRoute(
        path: '/dealer',
        redirect: (context, state) => '/dealer/dashboard',
        routes: [
          GoRoute(
            path: 'dashboard',
            builder: (context, state) => const DealerDashboardPage(),
          ),
          GoRoute(
            path: 'leads',
            builder: (context, state) => const DealerLeadsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const CreateLeadPage(),
              ),
              GoRoute(
                path: 'kanban',
                builder: (context, state) => const DealerLeadsKanbanPage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return LeadDetailPage(leadId: id);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return EditLeadPage(leadId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'inventory',
            builder: (context, state) => const DealerInventoryPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const CreateVehiclePage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return VehicleDetailPage(vehicleId: id);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return EditVehiclePage(vehicleId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'messages',
            builder: (context, state) => const DealerMessagesPage(),
          ),
          GoRoute(
            path: 'appointments',
            builder: (context, state) => const DealerAppointmentsPage(),
          ),
          GoRoute(
            path: 'sales-statistics',
            builder: (context, state) => const DealerSalesStatisticsPage(),
          ),
          GoRoute(
            path: 'reports',
            builder: (context, state) => const DealerReportsPage(),
          ),
          GoRoute(
            path: 'tasks',
            builder: (context, state) => const DealerTasksPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear tarea'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de tarea'),
              ),
            ],
          ),
          GoRoute(
            path: 'workflows',
            builder: (context, state) => const DealerWorkflowsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Crear workflow'),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de workflow'),
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) => const AdminPlaceholderPage(title: 'Editar workflow'),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'campaigns',
            builder: (context, state) => const DealerCampaignsPage(),
          ),
          GoRoute(
            path: 'promotions',
            builder: (context, state) => const DealerPromotionsPage(),
          ),
          GoRoute(
            path: 'banners',
            builder: (context, state) => const DealerBannersPage(),
          ),
          GoRoute(
            path: 'contracts',
            builder: (context, state) => const DealerContractsPage(),
          ),
          GoRoute(
            path: 'customer-files',
            builder: (context, state) => const DealerCustomerFilesPage(),
          ),
          GoRoute(
            path: 'fi',
            builder: (context, state) => const DealerFIPage(),
            routes: [
              GoRoute(
                path: 'metrics',
                builder: (context, state) => const DealerFIMetricsPage(),
              ),
              GoRoute(
                path: 'workflows',
                builder: (context, state) => const DealerFIWorkflowsPage(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle workflow FI'),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'reviews',
            builder: (context, state) => const DealerReviewsPage(),
          ),
          GoRoute(
            path: 'referrals',
            builder: (context, state) => const DealerReferralsPage(),
          ),
          GoRoute(
            path: 'reminders',
            builder: (context, state) => const DealerRemindersPage(),
          ),
          GoRoute(
            path: 'internal-chat',
            builder: (context, state) => const DealerInternalChatPage(),
          ),
          GoRoute(
            path: 'public-chat',
            builder: (context, state) => const DealerPublicChatPage(),
          ),
          GoRoute(
            path: 'social-posts',
            builder: (context, state) => const DealerSocialPostsPage(),
          ),
          GoRoute(
            path: 'announcements',
            builder: (context, state) => const DealerAnnouncementsPage(),
          ),
          GoRoute(
            path: 'sellers',
            builder: (context, state) => const DealerSellersPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return DealerSellerDetailPage(sellerId: id);
                },
              ),
              GoRoute(
                path: 'activity',
                builder: (context, state) => const DealerSellerActivityPage(),
              ),
            ],
          ),
          GoRoute(
            path: 'users',
            builder: (context, state) => const DealerUsersPage(),
          ),
          GoRoute(
            path: 'dealers',
            builder: (context, state) => const DealerDealersPage(),
          ),
          GoRoute(
            path: 'settings',
            builder: (context, state) => const DealerSettingsPage(),
            routes: [
              GoRoute(
                path: ':section',
                builder: (context, state) {
                  final section = state.pathParameters['section'] ?? 'Configuración';
                  final title = section == 'profile' ? 'Perfil' : section == 'membership' ? 'Membresía' : section == 'payment-methods' ? 'Métodos de Pago' : section == 'integrations' ? 'Integraciones' : section == 'branding' ? 'Branding' : section == 'corporate-emails' ? 'Emails Corporativos' : section == 'templates' ? 'Plantillas' : section == 'policies' ? 'Políticas' : section == 'ai' ? 'Configuración IA' : section == 'website' ? 'Sitio Web' : section == 'fi-manager' ? 'Gestor FI' : section;
                  return AdminPlaceholderPage(title: title);
                },
              ),
            ],
          ),
        ],
      ),
      // Seller Routes
      GoRoute(
        path: '/seller',
        redirect: (context, state) => '/seller/dashboard',
        routes: [
          GoRoute(
            path: 'dashboard',
            builder: (context, state) => const SellerDashboardPage(),
          ),
          GoRoute(
            path: 'leads',
            builder: (context, state) => const SellerLeadsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const CreateLeadPage(),
              ),
              GoRoute(
                path: 'kanban',
                builder: (context, state) => const SellerLeadsKanbanPage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return LeadDetailPage(leadId: id);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return EditLeadPage(leadId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'inventory',
            builder: (context, state) => const SellerInventoryPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const CreateVehiclePage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return VehicleDetailPage(vehicleId: id);
                },
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return EditVehiclePage(vehicleId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'messages',
            builder: (context, state) => const SellerMessagesPage(),
          ),
          GoRoute(
            path: 'appointments',
            builder: (context, state) => const SellerAppointmentsPage(),
          ),
          GoRoute(
            path: 'sales',
            builder: (context, state) => const SellerSalesPage(),
          ),
          GoRoute(
            path: 'sales-statistics',
            builder: (context, state) => const SellerSalesStatisticsPage(),
          ),
          GoRoute(
            path: 'reports',
            builder: (context, state) => const SellerReportsPage(),
          ),
          GoRoute(
            path: 'tasks',
            builder: (context, state) => const SellerTasksPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de tarea'),
              ),
            ],
          ),
          GoRoute(
            path: 'workflows',
            builder: (context, state) => const SellerWorkflowsPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de workflow'),
              ),
            ],
          ),
          GoRoute(
            path: 'campaigns',
            builder: (context, state) => const SellerCampaignsPage(),
          ),
          GoRoute(
            path: 'promotions',
            builder: (context, state) => const SellerPromotionsPage(),
          ),
          GoRoute(
            path: 'banners',
            builder: (context, state) => const SellerBannersPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => const AdminPlaceholderPage(title: 'Detalle de banner'),
              ),
            ],
          ),
          GoRoute(
            path: 'contracts',
            builder: (context, state) => const SellerContractsPage(),
          ),
          GoRoute(
            path: 'customer-files',
            builder: (context, state) => const SellerCustomerFilesPage(),
          ),
          GoRoute(
            path: 'fi',
            builder: (context, state) => const SellerFIPage(),
            routes: [
              GoRoute(
                path: 'requests/:id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return SellerFIRequestPage(requestId: id);
                },
              ),
              GoRoute(
                path: 'clients/new',
                builder: (context, state) => const SellerFIClientNewPage(),
              ),
              GoRoute(
                path: 'clients/:clientId/request',
                builder: (context, state) {
                  final clientId = state.pathParameters['clientId']!;
                  return SellerFIClientRequestPage(clientId: clientId);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'customers',
            builder: (context, state) => const SellerCustomersPage(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return SellerCustomerDetailPage(customerId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'reviews',
            builder: (context, state) => const SellerReviewsPage(),
          ),
          GoRoute(
            path: 'referrals',
            builder: (context, state) => const SellerReferralsPage(),
          ),
          GoRoute(
            path: 'internal-chat',
            builder: (context, state) => const SellerInternalChatPage(),
            routes: [
              GoRoute(
                path: ':userId',
                builder: (context, state) {
                  final userId = state.pathParameters['userId'] ?? '';
                  return SellerInternalChatConversationPage(otherUserId: userId);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'public-chat',
            builder: (context, state) => const SellerPublicChatPage(),
            routes: [
              GoRoute(
                path: ':sessionId',
                builder: (context, state) {
                  final sessionId = state.pathParameters['sessionId'] ?? '';
                  return SellerPublicChatConversationPage(sessionId: sessionId);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'social-posts',
            builder: (context, state) => const SellerSocialPostsPage(),
          ),
          GoRoute(
            path: 'users',
            builder: (context, state) => const SellerUsersPage(),
          ),
          GoRoute(
            path: 'settings',
            builder: (context, state) => const SellerSettingsPage(),
            routes: [
              GoRoute(
                path: ':section',
                builder: (context, state) {
                  final section = state.pathParameters['section'] ?? '';
                  final title = section == 'profile' ? 'Perfil' : section == 'notifications' ? 'Notificaciones' : section == 'security' ? 'Seguridad' : section;
                  return AdminPlaceholderPage(title: title.isEmpty ? 'Configuración' : title);
                },
              ),
            ],
          ),
        ],
      ),
      // Advertiser Routes
      GoRoute(
        path: '/advertiser',
        redirect: (context, state) => '/advertiser/dashboard',
        routes: [
          GoRoute(
            path: 'dashboard',
            builder: (context, state) => const AdvertiserDashboardPage(),
          ),
          GoRoute(
            path: 'ads',
            builder: (context, state) => const AdvertiserAdsPage(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const AdvertiserAdCreatePage(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = state.pathParameters['id'] ?? '';
                  return AdvertiserAdDetailPage(adId: id);
                },
              ),
            ],
          ),
          GoRoute(
            path: 'billing',
            builder: (context, state) => const AdvertiserBillingPage(),
          ),
        ],
      ),
      // Public Routes
      GoRoute(
        path: '/',
        builder: (context, state) => const PublicHomePage(),
      ),
      GoRoute(
        path: '/catalog',
        builder: (context, state) => const PublicVehiclesCatalogPage(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              final tenantId = state.uri.queryParameters['tenantId'] ?? '';
              return PublicVehicleDetailPage(vehicleId: id, tenantId: tenantId.isEmpty ? null : tenantId);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/contact',
        builder: (context, state) => const PublicContactPage(),
      ),
      GoRoute(
        path: '/dealers',
        builder: (context, state) => const PublicDealersPage(),
      ),
      GoRoute(
        path: '/privacidad',
        builder: (context, state) => const PublicPrivacidadPage(),
      ),
      GoRoute(
        path: '/terminos',
        builder: (context, state) => const PublicTerminosPage(),
      ),
      GoRoute(
        path: '/faq',
        builder: (context, state) => const PublicFaqPage(),
      ),
      GoRoute(
        path: '/precios',
        builder: (context, state) => const PublicPreciosPage(),
      ),
      GoRoute(
        path: '/compare',
        builder: (context, state) {
          final vehicleIdsParam = state.uri.queryParameters['vehicles'] ?? '';
          final vehicleIds = vehicleIdsParam.split(',').where((id) => id.isNotEmpty).toList();
          return CompareVehiclesPage(key: ValueKey(state.uri.toString()), vehicleIds: vehicleIds);
        },
      ),
      GoRoute(
        path: '/category/:categoryId',
        redirect: (context, state) {
          final id = state.pathParameters['categoryId'] ?? '';
          return '/catalog?category=${Uri.encodeComponent(id)}';
        },
      ),
      GoRoute(
        path: '/caracteristicas',
        builder: (context, state) => const StaticPlaceholderPage(title: 'Características', slug: 'caracteristicas'),
      ),
      GoRoute(
        path: '/sobre-nosotros',
        builder: (context, state) => const StaticPlaceholderPage(title: 'Sobre Nosotros', slug: 'sobre-nosotros'),
      ),
      GoRoute(
        path: '/advertise',
        builder: (context, state) => const StaticPlaceholderPage(title: 'Anunciar', slug: 'advertise'),
      ),
    ],
  );
}
