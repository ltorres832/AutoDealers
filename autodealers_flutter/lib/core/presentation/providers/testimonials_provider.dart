// Provider de Testimonials - Presentation Layer
import 'package:flutter/foundation.dart';
import '../../data/repositories/testimonials_repository.dart';

class TestimonialsProvider extends ChangeNotifier {
  final TestimonialsRepository _testimonialsRepository = TestimonialsRepository();

  List<Map<String, dynamic>> _testimonials = [];
  Map<String, dynamic>? _selectedTestimonial;
  bool _isLoading = false;
  String? _error;

  List<Map<String, dynamic>> get testimonials => _testimonials;
  Map<String, dynamic>? get selectedTestimonial => _selectedTestimonial;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Cargar testimonials
  Future<void> loadTestimonials({bool activeOnly = true}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _testimonialsRepository.watchTestimonials(activeOnly: activeOnly).listen((testimonials) {
        _testimonials = testimonials;
        _isLoading = false;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Seleccionar testimonial
  void selectTestimonial(Map<String, dynamic> testimonial) {
    _selectedTestimonial = testimonial;
    notifyListeners();
  }

  // Crear testimonial
  Future<bool> createTestimonial(Map<String, dynamic> testimonial) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _testimonialsRepository.createTestimonial(testimonial);
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

  // Actualizar testimonial
  Future<bool> updateTestimonial(String testimonialId, Map<String, dynamic> updates) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _testimonialsRepository.updateTestimonial(
        testimonialId: testimonialId,
        updates: updates,
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

  // Eliminar testimonial
  Future<bool> deleteTestimonial(String testimonialId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _testimonialsRepository.deleteTestimonial(testimonialId);
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


