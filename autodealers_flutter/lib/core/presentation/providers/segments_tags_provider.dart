// Provider de Segments & Tags - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/segments_tags_repository.dart';
import '../../data/services/firestore_service.dart';

class SegmentsTagsProvider extends ChangeNotifier {
  final SegmentsTagsRepository _repository = SegmentsTagsRepository();
  final FirestoreService _firestoreService = FirestoreService();

  List<Map<String, dynamic>> _segments = [];
  List<Map<String, dynamic>> _tags = [];
  bool _isLoading = false;
  String? _error;
  String? _tenantId;

  List<Map<String, dynamic>> get segments => _segments;
  List<Map<String, dynamic>> get tags => _tags;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> initialize(String? tenantId) async {
    _tenantId = tenantId ?? await _firestoreService.getCurrentTenantId();
    await loadSegments();
    await loadTags();
  }

  // ==================== Segments ====================

  Future<void> loadSegments() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _segments = await _repository.getSegments(_tenantId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createSegment(Map<String, dynamic> segment) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.createSegment(
        tenantId: _tenantId!,
        segment: segment,
      );
      await loadSegments();
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

  Future<bool> updateSegment({
    required String segmentId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.updateSegment(
        tenantId: _tenantId!,
        segmentId: segmentId,
        updates: updates,
      );
      await loadSegments();
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

  Future<bool> deleteSegment(String segmentId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.deleteSegment(
        tenantId: _tenantId!,
        segmentId: segmentId,
      );
      await loadSegments();
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

  // ==================== Tags ====================

  Future<void> loadTags() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _tags = await _repository.getTags(_tenantId!);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createTag(Map<String, dynamic> tag) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.createTag(
        tenantId: _tenantId!,
        tag: tag,
      );
      await loadTags();
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

  Future<bool> updateTag({
    required String tagId,
    required Map<String, dynamic> updates,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.updateTag(
        tenantId: _tenantId!,
        tagId: tagId,
        updates: updates,
      );
      await loadTags();
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

  Future<bool> deleteTag(String tagId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _repository.deleteTag(
        tenantId: _tenantId!,
        tagId: tagId,
      );
      await loadTags();
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


