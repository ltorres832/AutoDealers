// Provider de Autenticación - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../domain/models/user.dart';
import '../../data/repositories/auth_repository.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository = AuthRepository();
  
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthProvider() {
    print('AuthProvider: Constructor called');
    // NO escuchar cambios automáticamente para evitar rebuilds infinitos
    // Los cambios se manejarán manualmente en signIn/signOut
  }

  // Iniciar sesión
  Future<bool> signIn(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final user = await _authRepository.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      _user = user;
      _isLoading = false;
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      _user = null;
      notifyListeners();
      return false;
    }
  }

  // Registrar usuario
  Future<bool> signUp({
    required String email,
    required String password,
    required String name,
    required UserRole role,
    required String tenantId,
    required String membershipId,
    required TenantType membershipType,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _authRepository.signUpWithEmailAndPassword(
        email: email,
        password: password,
        name: name,
        role: role,
        tenantId: tenantId,
        membershipId: membershipId,
        membershipType: membershipType,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Cerrar sesión
  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authRepository.signOut();
      _user = null;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Obtener tenantId actual
  Future<String?> getCurrentTenantId() async {
    return await _authRepository.getCurrentTenantId();
  }
}


