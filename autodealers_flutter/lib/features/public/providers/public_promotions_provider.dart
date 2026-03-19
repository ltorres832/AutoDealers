// Provider de Promociones Públicas - Para la página pública sin tenantId específico
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/config/firebase_config.dart';

class Promotion {
  final String id;
  final String name;
  final String description;
  final String? imageUrl;
  final String tenantId;
  final String? tenantName;
  final String? vehicleId;
  final PromotionDiscount? discount;
  final double? sellerRating;
  final int? sellerRatingCount;
  final double? dealerRating;
  final int? dealerRatingCount;
  final DateTime? expiresAt;
  final int priority;

  Promotion({
    required this.id,
    required this.name,
    required this.description,
    this.imageUrl,
    required this.tenantId,
    this.tenantName,
    this.vehicleId,
    this.discount,
    this.sellerRating,
    this.sellerRatingCount,
    this.dealerRating,
    this.dealerRatingCount,
    this.expiresAt,
    this.priority = 0,
  });

  factory Promotion.fromJson(Map<String, dynamic> json, String id) {
    return Promotion(
      id: id,
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      imageUrl: json['imageUrl'],
      tenantId: json['tenantId'] ?? '',
      tenantName: json['tenantName'],
      vehicleId: json['vehicleId'],
      discount: json['discount'] != null
          ? PromotionDiscount.fromJson(json['discount'])
          : null,
      sellerRating: json['sellerRating']?.toDouble(),
      sellerRatingCount: json['sellerRatingCount'],
      dealerRating: json['dealerRating']?.toDouble(),
      dealerRatingCount: json['dealerRatingCount'],
      expiresAt: json['expiresAt'] is Timestamp
          ? (json['expiresAt'] as Timestamp).toDate()
          : json['expiresAt'] is DateTime
              ? json['expiresAt'] as DateTime
              : null,
      priority: json['priority'] ?? 0,
    );
  }
}

class PromotionDiscount {
  final String type; // 'percentage' or 'fixed'
  final double value;

  PromotionDiscount({required this.type, required this.value});

  factory PromotionDiscount.fromJson(Map<String, dynamic> json) {
    return PromotionDiscount(
      type: json['type'] ?? 'percentage',
      value: (json['value'] ?? 0).toDouble(),
    );
  }
}

class PublicPromotionsProvider extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  
  List<Promotion> _promotions = [];
  bool _isLoading = false;
  String? _error;
  StreamSubscription? _subscription;

  List<Promotion> get promotions => _promotions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadPromotions({int limit = 12}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Cancelar suscripción anterior si existe
      await _subscription?.cancel();

      // Usar collectionGroup para obtener promociones de todos los tenants
      final query = _firestore
          .collectionGroup('promotions')
          .where('isPaid', isEqualTo: true)
          .where('status', isEqualTo: 'active')
          .orderBy('priority', descending: true)
          .limit(limit);

      _subscription = query.snapshots().listen(
        (snapshot) async {
          final now = DateTime.now();
          final activePromotions = <Promotion>[];

          for (final doc in snapshot.docs) {
            final data = doc.data();
            
            // Filtrar promociones expiradas
            if (data['expiresAt'] != null) {
              final expiresAt = data['expiresAt'] is Timestamp
                  ? (data['expiresAt'] as Timestamp).toDate()
                  : data['expiresAt'] as DateTime?;
              if (expiresAt != null && expiresAt.isBefore(now)) {
                continue;
              }
            }

            // Obtener tenantId del path
            final pathParts = doc.reference.path.split('/');
            final tenantId = pathParts.length >= 2 ? pathParts[1] : '';

            // Obtener nombre del tenant
            String? tenantName;
            try {
              final tenantDoc = await _firestore.collection('tenants').doc(tenantId).get();
              if (tenantDoc.exists) {
                tenantName = tenantDoc.data()?['name'];
              }
            } catch (e) {
              debugPrint('Error fetching tenant name: $e');
            }

            // Obtener ratings si existen
            double? sellerRating;
            int? sellerRatingCount;
            double? dealerRating;
            int? dealerRatingCount;

            try {
              // Intentar obtener ratings del tenant
              final tenantDoc = await _firestore.collection('tenants').doc(tenantId).get();
              if (tenantDoc.exists) {
                final tenantData = tenantDoc.data();
                dealerRating = tenantData?['dealerRating']?.toDouble();
                dealerRatingCount = tenantData?['dealerRatingCount'];
              }
            } catch (e) {
              debugPrint('Error fetching ratings: $e');
            }

            activePromotions.add(Promotion.fromJson({
              ...data,
              'tenantId': tenantId,
              'tenantName': tenantName,
              'sellerRating': sellerRating,
              'sellerRatingCount': sellerRatingCount,
              'dealerRating': dealerRating,
              'dealerRatingCount': dealerRatingCount,
            }, doc.id));
          }

          // Ordenar por prioridad
          activePromotions.sort((a, b) => b.priority.compareTo(a.priority));

          _promotions = activePromotions.take(limit).toList();
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

  Future<void> incrementClick(String promotionId) async {
    try {
      // Buscar el documento de la promoción
      final query = await _firestore
          .collectionGroup('promotions')
          .where(FieldPath.documentId, isEqualTo: promotionId)
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        await query.docs.first.reference.update({
          'clicks': FieldValue.increment(1),
        });
      }
    } catch (e) {
      debugPrint('Error incrementing click: $e');
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}


