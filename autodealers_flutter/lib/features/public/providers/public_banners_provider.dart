// Provider de Banners Públicos - Para la página pública
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/config/firebase_config.dart';

class PublicBanner {
  final String id;
  final String imageUrl;
  final String title;
  final String description;
  final String ctaText;
  final String linkType; // 'vehicle' | 'dealer' | 'seller' | 'filter'
  final String linkValue;
  final int clicks;
  final int views;
  final String? tenantId;

  PublicBanner({
    required this.id,
    required this.imageUrl,
    required this.title,
    required this.description,
    required this.ctaText,
    required this.linkType,
    required this.linkValue,
    this.clicks = 0,
    this.views = 0,
    this.tenantId,
  });

  factory PublicBanner.fromJson(Map<String, dynamic> json, String id) {
    return PublicBanner(
      id: id,
      imageUrl: json['imageUrl'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      ctaText: json['ctaText'] ?? 'Ver más',
      linkType: json['linkType'] ?? 'dealer',
      linkValue: json['linkValue'] ?? '',
      clicks: json['clicks'] ?? 0,
      views: json['views'] ?? 0,
      tenantId: json['tenantId'],
    );
  }
}

class PublicBannersProvider extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  
  List<PublicBanner> _banners = [];
  bool _isLoading = false;
  String? _error;
  StreamSubscription? _subscription;

  List<PublicBanner> get banners => _banners;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadBanners({int limit = 4}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Cancelar suscripción anterior si existe
      await _subscription?.cancel();

      // Usar collectionGroup para obtener banners de todos los tenants
      final query = _firestore
          .collectionGroup('banners')
          .where('status', isEqualTo: 'active')
          .orderBy('priority', descending: true)
          .limit(limit);

      _subscription = query.snapshots().listen(
        (snapshot) async {
          final banners = <PublicBanner>[];

          for (final doc in snapshot.docs) {
            final data = doc.data();
            
            // Obtener tenantId del path
            final pathParts = doc.reference.path.split('/');
            final tenantId = pathParts.length >= 2 ? pathParts[1] : '';

            banners.add(PublicBanner.fromJson({
              ...data,
              'tenantId': tenantId,
            }, doc.id));
          }

          // Ordenar por prioridad
          banners.sort((a, b) {
            // Los banners con más views/clicks tienen mayor prioridad
            final aScore = a.views + a.clicks;
            final bScore = b.views + b.clicks;
            return bScore.compareTo(aScore);
          });

          _banners = banners.take(limit).toList();
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

  Future<void> incrementClick(String bannerId) async {
    try {
      // Buscar el documento del banner
      final query = await _firestore
          .collectionGroup('banners')
          .where(FieldPath.documentId, isEqualTo: bannerId)
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        await query.docs.first.reference.update({
          'clicks': FieldValue.increment(1),
        });
        
        // Actualizar en el estado local
        final index = _banners.indexWhere((b) => b.id == bannerId);
        if (index != -1) {
          final banner = _banners[index];
          _banners[index] = PublicBanner(
            id: banner.id,
            imageUrl: banner.imageUrl,
            title: banner.title,
            description: banner.description,
            ctaText: banner.ctaText,
            linkType: banner.linkType,
            linkValue: banner.linkValue,
            clicks: banner.clicks + 1,
            views: banner.views,
            tenantId: banner.tenantId,
          );
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Error incrementing banner click: $e');
    }
  }

  Future<void> incrementView(String bannerId) async {
    try {
      // Buscar el documento del banner
      final query = await _firestore
          .collectionGroup('banners')
          .where(FieldPath.documentId, isEqualTo: bannerId)
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        await query.docs.first.reference.update({
          'views': FieldValue.increment(1),
        });
      }
    } catch (e) {
      debugPrint('Error incrementing banner view: $e');
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}


