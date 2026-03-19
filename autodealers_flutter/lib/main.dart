import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'core/config/firebase_config.dart';
import 'core/data/services/firestore_service.dart';
import 'core/presentation/providers/auth_provider.dart';
import 'core/presentation/providers/dashboard_provider.dart';
import 'core/presentation/providers/crm_provider.dart';
import 'core/presentation/providers/inventory_provider.dart';
import 'core/presentation/providers/messaging_provider.dart';
import 'core/presentation/providers/appointments_provider.dart';
import 'core/presentation/providers/sales_provider.dart';
import 'core/presentation/providers/billing_provider.dart';
import 'core/presentation/providers/notifications_provider.dart';
import 'core/presentation/providers/reports_provider.dart';
import 'core/presentation/providers/ai_provider.dart';
import 'core/presentation/providers/workflows_provider.dart';
import 'core/presentation/providers/tasks_provider.dart';
import 'core/presentation/providers/social_media_provider.dart';
import 'core/presentation/providers/templates_provider.dart';
import 'core/presentation/providers/promotions_provider.dart';
import 'core/presentation/providers/contracts_provider.dart';
import 'core/presentation/providers/reviews_provider.dart';
import 'core/presentation/providers/referrals_provider.dart';
import 'core/presentation/providers/banners_provider.dart';
import 'core/presentation/providers/customer_files_provider.dart';
import 'core/presentation/providers/reminders_provider.dart';
import 'core/presentation/providers/internal_chat_provider.dart';
import 'core/presentation/providers/announcements_provider.dart';
import 'core/presentation/providers/corporate_emails_provider.dart';
import 'core/presentation/providers/fi_provider.dart';
import 'core/presentation/providers/public_chat_provider.dart';
import 'core/presentation/providers/settings_provider.dart';
import 'core/presentation/providers/integrations_provider.dart';
import 'core/presentation/providers/policies_provider.dart';
import 'core/presentation/providers/email_aliases_provider.dart';
import 'core/presentation/providers/pre_qualifications_provider.dart';
import 'core/presentation/providers/scoring_provider.dart';
import 'core/presentation/providers/segments_tags_provider.dart';
import 'core/presentation/providers/campaigns_provider.dart';
import 'core/presentation/providers/auto_responses_provider.dart';
import 'core/presentation/providers/feature_flags_provider.dart';
import 'core/presentation/providers/pricing_config_provider.dart';
import 'core/presentation/providers/faqs_provider.dart';
import 'core/presentation/providers/testimonials_provider.dart';
import 'core/presentation/providers/stripe_config_provider.dart';
import 'core/presentation/providers/ai_config_provider.dart';
import 'core/presentation/providers/dynamic_features_provider.dart';
import 'core/presentation/providers/landing_config_provider.dart';
import 'core/presentation/providers/maintenance_provider.dart';
import 'core/presentation/providers/communication_templates_provider.dart';
import 'core/presentation/providers/upload_provider.dart';
import 'core/presentation/providers/admin_provider.dart';
import 'core/presentation/providers/advertiser_provider.dart';
import 'features/public/providers/public_promotions_provider.dart';
import 'features/public/providers/compare_provider.dart';
import 'features/public/providers/public_dealers_provider.dart';
import 'features/public/providers/public_reviews_provider.dart';
import 'features/public/providers/public_banners_provider.dart';
import 'features/public/providers/sponsored_content_provider.dart';
import 'core/presentation/routing/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Si hay error de render (overflow, etc.) mostrar mensaje en pantalla y permitir COPIAR el texto.
  // Try-catch para que si este widget falla no deje la pantalla en blanco.
  ErrorWidget.builder = (FlutterErrorDetails details) {
    try {
      String message;
      try {
        message = details.exceptionAsString();
      } catch (_) {
        message = '${details.exception}';
      }
      return Material(
        color: Colors.white,
        child: SafeArea(
          child: SelectionArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 48, color: Colors.orange),
                    const SizedBox(height: 16),
                    SelectableText(
                      'Error de diseño',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800]),
                    ),
                    const SizedBox(height: 8),
                    SelectableText(
                      message,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      textAlign: TextAlign.left,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    } catch (e) {
      // Si SelectionArea/SelectableText fallan (p. ej. web), mostrar al menos el error copiable
      final fallbackMsg = details.exception?.toString() ?? 'Error desconocido';
      return Material(
        color: Colors.white,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 48, color: Colors.orange),
                  const SizedBox(height: 16),
                  Text('Error de diseño', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                  const SizedBox(height: 8),
                  SelectableText(fallbackMsg, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  const SizedBox(height: 8),
                  SelectableText('Error al mostrar widget: $e', style: const TextStyle(fontSize: 11, color: Colors.red)),
                ],
              ),
            ),
          ),
        ),
      );
    }
  };

  print('=== Iniciando AutoDealers App ===');

  // Mostrar pantalla de carga al instante; Firebase se inicializa en segundo plano.
  runApp(const _InitializingApp());
}

/// Primera pantalla siempre síncrona; Firebase se inicia en initState y setState al terminar.
class _InitializingApp extends StatefulWidget {
  const _InitializingApp();

  @override
  State<_InitializingApp> createState() => _InitializingAppState();
}

class _InitializingAppState extends State<_InitializingApp> {
  static bool? _ok;
  static Object? _error;
  static Object? _stackTrace;

  @override
  void initState() {
    super.initState();
    if (_ok == null) {
      _initialize().then((_) {
        if (mounted) setState(() { _ok = true; });
      }).catchError((Object e, Object? st) {
        if (mounted) setState(() { _ok = false; _error = e; _stackTrace = st; });
      });
    }
  }

  static Future<void> _initialize() async {
    await FirebaseConfig.initialize().timeout(
      const Duration(seconds: 15),
      onTimeout: () => TimeoutException('Firebase no respondió. Recarga la página.'),
    );
    FirestoreService().configure();
  }

  @override
  Widget build(BuildContext context) {
    if (_ok == null) {
      return MaterialApp(
        home: Scaffold(
          backgroundColor: const Color(0xFFE3F2FD),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 24),
                Text(
                  'Cargando AutoDealers…',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.blue[800]),
                ),
              ],
            ),
          ),
        ),
      );
    }
    if (_ok == false) {
      return _buildErrorApp(
        _error is TimeoutException ? (_error as TimeoutException).message ?? 'Tiempo agotado' : '$_error',
        _stackTrace,
      );
    }
    return const AutoDealersApp();
  }
}

Widget _buildErrorApp(String message, Object? stackTrace) {
  return MaterialApp(
    home: Scaffold(
      body: SelectionArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const SelectableText(
                  'Error al inicializar la aplicación',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SelectableText(
                  message,
                  style: const TextStyle(fontSize: 12),
                  textAlign: TextAlign.center,
                ),
                if (stackTrace != null) ...[
                  const SizedBox(height: 8),
                  SelectableText(
                    'Stack trace:\n$stackTrace',
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                    textAlign: TextAlign.left,
                  ),
                ],
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    main();
                  },
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class AutoDealersApp extends StatelessWidget {
  const AutoDealersApp({super.key});

  @override
  Widget build(BuildContext context) {
    print('AutoDealersApp: Building widget');
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => CrmProvider()),
        ChangeNotifierProvider(create: (_) => InventoryProvider()),
        ChangeNotifierProvider(create: (_) => MessagingProvider()),
        ChangeNotifierProvider(create: (_) => AppointmentsProvider()),
        ChangeNotifierProvider(create: (_) => SalesProvider()),
        ChangeNotifierProvider(create: (_) => BillingProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
        ChangeNotifierProvider(create: (_) => ReportsProvider()),
        ChangeNotifierProvider(create: (_) => AIProvider()),
        ChangeNotifierProvider(create: (_) => WorkflowsProvider()),
        ChangeNotifierProvider(create: (_) => TasksProvider()),
        ChangeNotifierProvider(create: (_) => SocialMediaProvider()),
        ChangeNotifierProvider(create: (_) => TemplatesProvider()),
        ChangeNotifierProvider(create: (_) => PromotionsProvider()),
        ChangeNotifierProvider(create: (_) => ContractsProvider()),
        ChangeNotifierProvider(create: (_) => ReviewsProvider()),
        ChangeNotifierProvider(create: (_) => ReferralsProvider()),
        ChangeNotifierProvider(create: (_) => BannersProvider()),
        ChangeNotifierProvider(create: (_) => CustomerFilesProvider()),
        ChangeNotifierProvider(create: (_) => RemindersProvider()),
        ChangeNotifierProvider(create: (_) => InternalChatProvider()),
        ChangeNotifierProvider(create: (_) => AnnouncementsProvider()),
        ChangeNotifierProvider(create: (_) => CorporateEmailsProvider()),
        ChangeNotifierProvider(create: (_) => FIProvider()),
        ChangeNotifierProvider(create: (_) => PublicChatProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => IntegrationsProvider()),
        ChangeNotifierProvider(create: (_) => PoliciesProvider()),
        ChangeNotifierProvider(create: (_) => EmailAliasesProvider()),
        ChangeNotifierProvider(create: (_) => PreQualificationsProvider()),
        ChangeNotifierProvider(create: (_) => ScoringProvider()),
        ChangeNotifierProvider(create: (_) => SegmentsTagsProvider()),
        ChangeNotifierProvider(create: (_) => CampaignsProvider()),
        ChangeNotifierProvider(create: (_) => AutoResponsesProvider()),
        ChangeNotifierProvider(create: (_) => FeatureFlagsProvider()),
        ChangeNotifierProvider(create: (_) => PricingConfigProvider()),
        ChangeNotifierProvider(create: (_) => FAQsProvider()),
        ChangeNotifierProvider(create: (_) => TestimonialsProvider()),
        ChangeNotifierProvider(create: (_) => StripeConfigProvider()),
        ChangeNotifierProvider(create: (_) => AIConfigProvider()),
        ChangeNotifierProvider(create: (_) => DynamicFeaturesProvider()),
        ChangeNotifierProvider(create: (_) => LandingConfigProvider()),
        ChangeNotifierProvider(create: (_) => MaintenanceProvider()),
        ChangeNotifierProvider(create: (_) => CommunicationTemplatesProvider()),
        ChangeNotifierProvider(create: (_) => UploadProvider()),
        ChangeNotifierProvider(create: (_) => AdminProvider()),
        ChangeNotifierProvider(create: (_) => AdvertiserProvider()),
        // Providers públicos para la página pública
        ChangeNotifierProvider(create: (_) => PublicPromotionsProvider()..loadPromotions()),
        ChangeNotifierProvider(create: (_) => CompareProvider()),
        ChangeNotifierProvider(create: (_) => PublicDealersProvider()..loadDealers()),
        ChangeNotifierProvider(create: (_) => PublicReviewsProvider()..loadReviews()),
        ChangeNotifierProvider(create: (_) => PublicBannersProvider()..loadBanners()),
        // Providers de contenido patrocinado (sponsored_content)
        // Nota: Cada widget buscará el provider correcto por placement
        ChangeNotifierProvider(create: (_) => SponsoredContentProvider(placement: 'hero', limit: 5)),
        ChangeNotifierProvider(create: (_) => SponsoredContentProvider(placement: 'sidebar', limit: 10)),
      ],
      child: MaterialApp.router(
        title: 'AutoDealers',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue, brightness: Brightness.light),
          useMaterial3: true,
          scaffoldBackgroundColor: Colors.white,
        ),
        // No usar SelectionArea aquí: requiere un Overlay ancestro (Navigator) que aún no existe.
        builder: (context, child) {
          return Container(
            color: Colors.white,
            child: child ?? const Center(child: Text('Cargando...')),
          );
        },
        routerConfig: AppRouter.router,
      ),
    );
  }
}


