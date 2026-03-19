// Provider de Contenido Patrocinado - Replica exacta de Next.js useRealtimeSponsoredContent
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/config/firebase_config.dart';

class SponsoredContent {
  final String id;
  final String advertiserId;
  final String advertiserName;
  final String type; // 'banner' | 'promotion' | 'sponsor'
  final String placement; // 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'
  final String title;
  final String description;
  final String imageUrl;
  final String? videoUrl;
  final String linkUrl;
  final String? linkType; // 'external' | 'landing_page'
  final int impressions;
  final int clicks;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? createdAt;

  SponsoredContent({
    required this.id,
    required this.advertiserId,
    required this.advertiserName,
    required this.type,
    required this.placement,
    required this.title,
    required this.description,
    required this.imageUrl,
    this.videoUrl,
    required this.linkUrl,
    this.linkType,
    this.impressions = 0,
    this.clicks = 0,
    this.status = 'active',
    this.startDate,
    this.endDate,
    this.createdAt,
  });

  factory SponsoredContent.fromJson(Map<String, dynamic> json, String id) {
    return SponsoredContent(
      id: id,
      advertiserId: json['advertiserId'] ?? '',
      advertiserName: json['advertiserName'] ?? '',
      type: json['type'] ?? 'banner',
      placement: json['placement'] ?? 'hero',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      videoUrl: json['videoUrl'],
      linkUrl: json['linkUrl'] ?? '',
      linkType: json['linkType'],
      impressions: json['impressions'] ?? 0,
      clicks: json['clicks'] ?? 0,
      status: json['status'] ?? 'active',
      startDate: (json['startDate'] as Timestamp?)?.toDate(),
      endDate: (json['endDate'] as Timestamp?)?.toDate(),
      createdAt: (json['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}

class SponsoredContentProvider extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;
  
  List<SponsoredContent> _content = [];
  bool _isLoading = true;
  String? _error;
  StreamSubscription? _subscription;
  final String? _placement;
  final int _limit;

  SponsoredContentProvider({String? placement, int limit = 6})
      : _placement = placement,
        _limit = limit {
    _loadContent();
  }

  List<SponsoredContent> get content => _content;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get placement => _placement;

  Future<void> _loadContent() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _subscription?.cancel();

      Query query = _firestore.collection('sponsored_content')
          .where('status', whereIn: ['active', 'approved']);

      if (_placement != null) {
        query = query.where('placement', isEqualTo: _placement);
      }

      query = query.orderBy('createdAt', descending: true).limit(_limit);

      _subscription = query.snapshots().listen(
        (snapshot) {
          final now = DateTime.now();
          final activeContent = <SponsoredContent>[];

          for (final doc in snapshot.docs) {
            final data = doc.data() as Map<String, dynamic>?;
            if (data == null) continue;
            
            final startDate = data['startDate'] as Timestamp?;
            final endDate = data['endDate'] as Timestamp?;

            // Filtrar contenido expirado
            if (startDate != null && startDate.toDate().isAfter(now)) {
              continue;
            }
            if (endDate != null && endDate.toDate().isBefore(now)) {
              continue;
            }

            activeContent.add(SponsoredContent.fromJson(data, doc.id));
          }

          // Ordenar por createdAt descendente
          activeContent.sort((a, b) {
            final aTime = a.createdAt?.millisecondsSinceEpoch ?? 0;
            final bTime = b.createdAt?.millisecondsSinceEpoch ?? 0;
            return bTime.compareTo(aTime);
          });

          _content = activeContent.take(_limit).toList();
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

  Future<void> incrementClick(String contentId) async {
    try {
      await _firestore.collection('sponsored_content').doc(contentId).update({
        'clicks': FieldValue.increment(1),
      });
      
      final index = _content.indexWhere((c) => c.id == contentId);
      if (index != -1) {
        final content = _content[index];
        _content[index] = SponsoredContent(
          id: content.id,
          advertiserId: content.advertiserId,
          advertiserName: content.advertiserName,
          type: content.type,
          placement: content.placement,
          title: content.title,
          description: content.description,
          imageUrl: content.imageUrl,
          videoUrl: content.videoUrl,
          linkUrl: content.linkUrl,
          linkType: content.linkType,
          impressions: content.impressions,
          clicks: content.clicks + 1,
          status: content.status,
          startDate: content.startDate,
          endDate: content.endDate,
          createdAt: content.createdAt,
        );
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error incrementing sponsored content click: $e');
    }
  }

  Future<void> incrementImpression(String contentId) async {
    try {
      await _firestore.collection('sponsored_content').doc(contentId).update({
        'impressions': FieldValue.increment(1),
      });
    } catch (e) {
      debugPrint('Error incrementing sponsored content impression: $e');
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}


