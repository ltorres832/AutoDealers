// Provider de Inventario - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/models/vehicle.dart';
import '../../data/repositories/inventory_repository.dart';
import '../../data/services/firestore_service.dart';

class InventoryProvider extends ChangeNotifier {
  final InventoryRepository _inventoryRepository = InventoryRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Vehicle> _vehicles = [];
  Vehicle? _selectedVehicle;
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Vehicle>>? _vehiclesSubscription;

  List<Vehicle> get vehicles => _vehicles;
  Vehicle? get selectedVehicle => _selectedVehicle;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Inicializar con tenantId
  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadVehicles();
  }

  // Cargar vehículos. Si [tenantIdFilter] se indica (p. ej. dealerId desde catálogo público), filtra por ese tenant.
  Future<void> loadVehicles({
    VehicleStatus? status,
    VehicleCondition? condition,
    String? make,
    String? model,
    String? tenantIdFilter,
  }) async {
    // Cancelar suscripción anterior si existe
    _vehiclesSubscription?.cancel();
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final effectiveTenantId = tenantIdFilter ?? _tenantId;
      final isPublicCatalog = effectiveTenantId == null || effectiveTenantId.isEmpty;

      if (isPublicCatalog) {
        _vehiclesSubscription = _inventoryRepository.watchPublicVehicles(
          status: status,
          limit: 500,
        ).listen(
        (vehicles) {
          _vehicles = vehicles;
          if (condition != null) {
            _vehicles = _vehicles.where((v) => v.condition == condition).toList();
          }
          if (make != null) {
            _vehicles = _vehicles.where((v) => v.make == make).toList();
          }
          if (model != null) {
            _vehicles = _vehicles.where((v) => v.model == model).toList();
          }
          _isLoading = false;
          notifyListeners();
        },
        onError: (error) {
          _error = error.toString();
          _isLoading = false;
          notifyListeners();
        },
      );
        return;
      }

      _vehiclesSubscription = _inventoryRepository.watchVehicles(
        tenantId: effectiveTenantId,
        status: status,
        condition: condition,
        make: make,
        model: model,
      ).listen(
        (vehicles) {
          _vehicles = vehicles;
          _isLoading = false;
          notifyListeners();
        },
        onError: (error) {
          _error = error.toString();
          _isLoading = false;
          notifyListeners();
        },
      );
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _vehiclesSubscription?.cancel();
    super.dispose();
  }

  // Seleccionar vehículo
  void selectVehicle(Vehicle vehicle) {
    _selectedVehicle = vehicle;
    notifyListeners();
  }

  // Crear vehículo
  Future<bool> createVehicle(Vehicle vehicle) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _inventoryRepository.createVehicle(vehicle, tenantId: _tenantId);
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

  // Actualizar vehículo
  Future<bool> updateVehicle(String vehicleId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _inventoryRepository.updateVehicle(vehicleId, updates, tenantId: _tenantId);
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

  // Eliminar vehículo
  Future<bool> deleteVehicle(String vehicleId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _inventoryRepository.deleteVehicle(vehicleId, tenantId: _tenantId);
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

  // Marcar como vendido
  Future<bool> markAsSold(String vehicleId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _inventoryRepository.markAsSold(vehicleId, tenantId: _tenantId);
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

  // Toggle publicación en página pública
  Future<bool> togglePublicPage(String vehicleId, bool published) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _inventoryRepository.togglePublicPage(vehicleId, published, tenantId: _tenantId);
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
}


