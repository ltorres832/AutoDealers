// Configuración de Firebase para Flutter Web
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';

class FirebaseConfig {
  static FirebaseAuth? _auth;
  static FirebaseFirestore? _firestore;
  static FirebaseStorage? _storage;

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
    // Inicializar Firebase con la configuración
    await Firebase.initializeApp(
      options: _firebaseOptions,
    );
    
    _auth = FirebaseAuth.instance;
    _firestore = FirebaseFirestore.instance;
    _storage = FirebaseStorage.instance;
  }

  static FirebaseAuth get auth => _auth!;
  static FirebaseFirestore get firestore => _firestore!;
  static FirebaseStorage get storage => _storage!;
}


