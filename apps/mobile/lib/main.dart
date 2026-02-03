import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'package:provider/provider.dart';
import 'core/config/firebase_config.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/firestore_service.dart';
import 'core/services/sync_service.dart';
import 'features/auth/providers/auth_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar Firebase
  await FirebaseConfig.initialize();
  
  // Configurar servicios de sincronización
  FirestoreService().configure();
  
  runApp(const AutoDealersApp());
}

class AutoDealersApp extends StatelessWidget {
  const AutoDealersApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        // Agregar más providers aquí
      ],
      child: MaterialApp.router(
        title: 'AutoDealers',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: AppRouter.router,
      ),
    );
  }
}




