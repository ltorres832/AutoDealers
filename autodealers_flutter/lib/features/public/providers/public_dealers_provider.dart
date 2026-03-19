// Provider de Dealers Públicos - Para la página pública
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/config/firebase_config.dart';

class PublicDealer {
  final String id;
  final String name;
  final String? photo;
  final double? rating;
  final int? ratingCount;
  final int? vehicleCount;
  final String? location;

  PublicDealer({
    required this.id,
    required this.name,
    this.photo,
    this.rating,
    this.ratingCount,
    this.vehicleCount,
    this.location,
  });

  factory PublicDealer.fromJson(Map<String, dynamic> json, String id) {
    final branding = json['branding'] is Map ? json['branding'] as Map<String, dynamic>? : null;
    final settings = json['settings'] is Map ? json['settings'] as Map<String, dynamic>? : null;
    final photo = json['photo'] ?? json['imageUrl'] ?? json['avatar'] ?? json['logoUrl']
        ?? branding?['logoUrl'] ?? branding?['logo'] ?? branding?['imageUrl'];
    final location = json['location'] ?? json['address'] ?? settings?['location'] ?? settings?['address'];
    return PublicDealer(
      id: id,
      name: json['name']?.toString() ?? json['displayName']?.toString() ?? 'Concesionario',
      photo: photo?.toString(),
      rating: (json['dealerRating'] ?? json['rating'])?.toDouble(),
      ratingCount: json['dealerRatingCount'] ?? json['ratingCount'],
      vehicleCount: json['publishedVehiclesCount'],
      location: location?.toString(),
    );
  }
}

class PublicDealersProvider extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  
  List<PublicDealer> _dealers = [];
  bool _isLoading = false;
  String? _error;
  StreamSubscription? _subscription;

  List<PublicDealer> get dealers => _dealers;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadDealers({int limit = 6}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Cancelar suscripción anterior si existe
      await _subscription?.cancel();

      // Obtener tenants activos con tipo 'dealer'
      final query = _firestore
          .collection('tenants')
          .where('status', isEqualTo: 'active')
          .where('type', isEqualTo: 'dealer')
          .limit(limit);

      _subscription = query.snapshots().listen(
        (snapshot) async {
          final dealers = <PublicDealer>[];

          for (final doc in snapshot.docs) {
            final data = doc.data();
            
            // Contar vehículos publicados
            int vehicleCount = 0;
            try {
              final vehiclesSnapshot = await _firestore
                  .collection('tenants')
                  .doc(doc.id)
                  .collection('vehicles')
                  .where('status', isEqualTo: 'available')
                  .where('publishedOnPublicPage', isEqualTo: true)
                  .limit(100)
                  .get();
              vehicleCount = vehiclesSnapshot.docs.length;
            } catch (e) {
              debugPrint('Error counting vehicles: $e');
            }

            dealers.add(PublicDealer.fromJson({
              ...data,
              'publishedVehiclesCount': vehicleCount,
            }, doc.id));
          }

          // Ordenar por rating y cantidad de vehículos
          dealers.sort((a, b) {
            final ratingA = a.rating ?? 0;
            final ratingB = b.rating ?? 0;
            if (ratingA != ratingB) {
              return ratingB.compareTo(ratingA);
            }
            return (b.vehicleCount ?? 0).compareTo(a.vehicleCount ?? 0);
          });

          _dealers = dealers.take(limit).toList();
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
    _subscription?.cancel();
    super.dispose();
  }
}


