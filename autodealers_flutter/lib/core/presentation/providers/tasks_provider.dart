// Provider de Tasks - Presentation Layer
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../data/repositories/tasks_repository.dart';
import '../../data/services/firestore_service.dart';

class TasksProvider extends ChangeNotifier {
  final TasksRepository _tasksRepository = TasksRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _tasks = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;
  StreamSubscription<List<Map<String, dynamic>>>? _tasksSubscription;

  List<Map<String, dynamic>> get tasks => _tasks;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadTasks();
  }

  // Cargar tasks (stream en tiempo real)
  Future<void> loadTasks({String? assignedTo, bool? completed}) async {
    if (_tenantId == null) return;

    // Cancelar suscripción anterior si existe
    _tasksSubscription?.cancel();

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _tasksSubscription = _tasksRepository.watchTasks(
        tenantId: _tenantId,
        assignedTo: assignedTo,
        completed: completed,
      ).listen(
        (tasks) {
          _tasks = tasks;
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
    _tasksSubscription?.cancel();
    super.dispose();
  }

  // Crear task
  Future<bool> createTask(Map<String, dynamic> task) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _tasksRepository.createTask(
        tenantId: _tenantId!,
        task: task,
      );
      await loadTasks();
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

  // Actualizar task
  Future<bool> updateTask({
    required String taskId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _tasksRepository.updateTask(
        tenantId: _tenantId!,
        taskId: taskId,
        updates: updates,
      );
      await loadTasks();
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

  // Completar task
  Future<bool> completeTask(String taskId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _tasksRepository.completeTask(
        tenantId: _tenantId!,
        taskId: taskId,
      );
      await loadTasks();
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

  // Eliminar task
  Future<bool> deleteTask(String taskId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _tasksRepository.deleteTask(
        tenantId: _tenantId!,
        taskId: taskId,
      );
      await loadTasks();
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
