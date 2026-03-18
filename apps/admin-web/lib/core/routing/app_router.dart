import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/pages/login_page.dart';
import '../../features/dashboard/pages/dashboard_page.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardPage(),
      ),
    ],
  );
}


