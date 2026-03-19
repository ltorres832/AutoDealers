// Configuración de Firebase
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_functions/cloud_functions.dart';

class FirebaseConfig {
  static FirebaseAuth? _auth;
  static FirebaseFirestore? _firestore;
  static FirebaseStorage? _storage;
  static FirebaseMessaging? _messaging;
  static FirebaseFunctions? _functions;

  // Configuración de Firebase - Valores del proyecto AutoDealers
  static const FirebaseOptions _firebaseOptions = FirebaseOptions(
    apiKey: 'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
    appId: '1:857179023916:web:6919fe5ae77f78d3b1bf89',
    messagingSenderId: '857179023916',
    projectId: 'autodealers-7f62e',
    authDomain: 'autodealers-7f62e.firebaseapp.com',
    storageBucket: 'autodealers-7f62e.firebasestorage.app',
  );

  static Future<void> initialize() async {
    try {
      print('Inicializando Firebase...');
      await Firebase.initializeApp(
        options: _firebaseOptions,
      );
      print('Firebase inicializado correctamente');
      
      _auth = FirebaseAuth.instance;
      _firestore = FirebaseFirestore.instance;
      _storage = FirebaseStorage.instance;
      _messaging = FirebaseMessaging.instance;
      _functions = FirebaseFunctions.instance;
      
      print('Servicios de Firebase configurados');
      
      // En web no usar persistencia (IndexedDB puede colgar); en móvil sí.
      try {
        _firestore!.settings = Settings(
          persistenceEnabled: !kIsWeb,
          cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
        );
        print('Firestore configurado');
      } catch (e) {
        print('Warning: Firestore settings: $e');
      }
      
      // Notificaciones solo en móvil; en web FCM puede colgar el arranque.
      if (!kIsWeb) {
        Future.microtask(() async {
          try {
            await _setupNotifications();
            print('Notificaciones configuradas');
          } catch (e) {
            print('Warning: Notifications: $e');
          }
        });
      }
      
      print('Firebase completamente inicializado');
    } catch (e, stackTrace) {
      print('Error initializing Firebase: $e');
      print('Stack trace: $stackTrace');
      rethrow;
    }
  }

  static Future<void> _setupNotifications() async {
    final settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      final token = await _messaging!.getToken();
      print('FCM Token: $token');
    }

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Mensaje recibido: ${message.notification?.title}');
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notificación abierta: ${message.notification?.title}');
    });
  }

  static FirebaseAuth get auth => _auth!;
  static FirebaseFirestore get firestore => _firestore!;
  static FirebaseStorage get storage => _storage!;
  static FirebaseMessaging get messaging => _messaging!;
  static FirebaseFunctions get functions => _functions!;
}


