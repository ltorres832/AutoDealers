// Provider de Administración - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/admin_repository.dart';
import '../../data/repositories/admin_api_repository.dart';

class AdminProvider extends ChangeNotifier {
  final AdminRepository _adminRepository = AdminRepository();
  final AdminApiRepository _adminApiRepository = AdminApiRepository();

  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _tenants = [];
  List<Map<String, dynamic>> _sellers = [];
  Map<String, dynamic>? _selectedUser;
  Map<String, dynamic>? _selectedTenant;
  Map<String, dynamic>? _selectedSeller;
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get users => _users;
  List<Map<String, dynamic>> get tenants => _tenants;
  List<Map<String, dynamic>> get sellers => _sellers;
  Map<String, dynamic>? get selectedUser => _selectedUser;
  Map<String, dynamic>? get selectedTenant => _selectedTenant;
  Map<String, dynamic>? get selectedSeller => _selectedSeller;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Usuarios
  Future<void> loadUsers() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _users = await _adminRepository.getAllUsers();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadUser(String userId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _selectedUser = await _adminRepository.getUserById(userId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateUser(String userId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _adminRepository.updateUser(userId, updates);
      await loadUsers();
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

  Future<bool> updateUserStatus(String userId, String status) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _adminRepository.updateUserStatus(userId, status);
      await loadUsers();
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

  void selectUser(Map<String, dynamic> user) {
    _selectedUser = user;
    notifyListeners();
  }

  /// Crear usuario vía API Admin (email, password, name, role, tenantId?)
  Future<Map<String, dynamic>?> createUser(Map<String, dynamic> body) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _adminApiRepository.createUser(body);
      _isLoading = false;
      if (result != null) await loadUsers();
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Tenants
  Future<void> loadTenants() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _tenants = await _adminRepository.getAllTenants();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadTenant(String tenantId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _selectedTenant = await _adminRepository.getTenantById(tenantId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateTenant(String tenantId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _adminRepository.updateTenant(tenantId, updates);
      await loadTenants();
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

  Future<bool> updateTenantStatus(String tenantId, String status) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _adminRepository.updateTenantStatus(tenantId, status);
      await loadTenants();
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

  void selectTenant(Map<String, dynamic> tenant) {
    _selectedTenant = tenant;
    notifyListeners();
  }

  /// Crear tenant vía API Admin (name, type, subdomain, companyName?)
  Future<Map<String, dynamic>?> createTenant(Map<String, dynamic> body) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _adminApiRepository.createTenant(body);
      _isLoading = false;
      if (result != null) await loadTenants();
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Crear membresía vía API Admin (name, type, price, currency?, billingCycle?, isActive?)
  Future<Map<String, dynamic>?> createMembership(Map<String, dynamic> body) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _adminApiRepository.createMembership(body);
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Sellers
  Future<void> loadSellers() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _sellers = await _adminRepository.getAllSellers();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadSeller(String sellerId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _selectedSeller = await _adminRepository.getSellerById(sellerId);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateSeller(String sellerId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _adminRepository.updateSeller(sellerId, updates);
      await loadSellers();
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

  void selectSeller(Map<String, dynamic> seller) {
    _selectedSeller = seller;
    notifyListeners();
  }
}


