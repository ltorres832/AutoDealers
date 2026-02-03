import 'package:go_router/go_router.dart';
import 'app_router_complete.dart';

/// Router principal de la aplicación
/// Usa el router completo con todas las rutas
class AppRouter {
  static final GoRouter router = AppRouterComplete.createRouter();
}
