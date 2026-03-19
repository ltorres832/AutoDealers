// Provider de Reviews Públicos - Para la página pública
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/config/firebase_config.dart';

class PublicReview {
  final String id;
  final String customerName;
  final String? customerPhoto;
  final double rating;
  final String comment;
  final String? vehicleName;
  final String? dealerName;
  final String? sellerName;
  final DateTime createdAt;
  final bool verified;
  final String? tenantId;

  PublicReview({
    required this.id,
    required this.customerName,
    this.customerPhoto,
    required this.rating,
    required this.comment,
    this.vehicleName,
    this.dealerName,
    this.sellerName,
    required this.createdAt,
    this.verified = false,
    this.tenantId,
  });

  factory PublicReview.fromJson(Map<String, dynamic> json, String id) {
    return PublicReview(
      id: id,
      customerName: json['customerName'] ?? 'Cliente',
      customerPhoto: json['customerPhoto'],
      rating: (json['rating'] ?? 5).toDouble(),
      comment: json['comment'] ?? '',
      vehicleName: json['vehicleName'],
      dealerName: json['dealerName'],
      sellerName: json['sellerName'],
      createdAt: json['createdAt'] is Timestamp
          ? (json['createdAt'] as Timestamp).toDate()
          : json['createdAt'] is DateTime
              ? json['createdAt'] as DateTime
              : DateTime.now(),
      verified: json['verified'] ?? false,
      tenantId: json['tenantId'],
    );
  }
}

class PublicReviewsProvider extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  
  List<PublicReview> _reviews = [];
  bool _isLoading = false;
  String? _error;
  StreamSubscription? _subscription;

  List<PublicReview> get reviews => _reviews;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadReviews({int limit = 6}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Cancelar suscripción anterior si existe
      await _subscription?.cancel();

      // Usar collectionGroup para obtener reviews de todos los tenants
      final query = _firestore
          .collectionGroup('reviews')
          .where('status', isEqualTo: 'approved')
          .orderBy('createdAt', descending: true)
          .limit(limit);

      _subscription = query.snapshots().listen(
        (snapshot) async {
          final reviews = <PublicReview>[];

          for (final doc in snapshot.docs) {
            final data = doc.data();
            
            // Obtener tenantId del path
            final pathParts = doc.reference.path.split('/');
            final tenantId = pathParts.length >= 2 ? pathParts[1] : '';

            // Obtener información del vehículo si existe
            String? vehicleName;
            if (data['vehicleId'] != null && tenantId.isNotEmpty) {
              try {
                final vehicleDoc = await _firestore
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('vehicles')
                    .doc(data['vehicleId'])
                    .get();
                if (vehicleDoc.exists) {
                  final vehicleData = vehicleDoc.data();
                  vehicleName = '${vehicleData?['year'] ?? ''} ${vehicleData?['make'] ?? ''} ${vehicleData?['model'] ?? ''}'.trim();
                }
              } catch (e) {
                debugPrint('Error fetching vehicle: $e');
              }
            }

            // Obtener información del dealer/seller
            String? dealerName;
            String? sellerName;
            
            if (data['dealerId'] != null) {
              try {
                final dealerDoc = await _firestore.collection('users').doc(data['dealerId']).get();
                if (dealerDoc.exists) {
                  dealerName = dealerDoc.data()?['name'];
                }
              } catch (e) {
                debugPrint('Error fetching dealer: $e');
              }
            }

            if (data['sellerId'] != null) {
              try {
                final sellerDoc = await _firestore.collection('users').doc(data['sellerId']).get();
                if (sellerDoc.exists) {
                  sellerName = sellerDoc.data()?['name'];
                }
              } catch (e) {
                debugPrint('Error fetching seller: $e');
              }
            }

            reviews.add(PublicReview.fromJson({
              ...data,
              'tenantId': tenantId,
              'vehicleName': vehicleName,
              'dealerName': dealerName,
              'sellerName': sellerName,
            }, doc.id));
          }

          _reviews = reviews;
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


