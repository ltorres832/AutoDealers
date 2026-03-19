// Llamadas a la API del app Advertiser (Next.js)
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../config/firebase_config.dart';

class AdvertiserRepository {
  String get _base => kAdvertiserApiBaseUrl;

  Future<String?> _getIdToken() async {
    return await FirebaseConfig.auth.currentUser?.getIdToken();
  }

  Future<Map<String, String>> _headers() async {
    final token = await _getIdToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>?> getMe() async {
    final res = await http.get(
      Uri.parse('$_base/api/advertiser/me'),
      headers: await _headers(),
    );
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return data['advertiser'] as Map<String, dynamic>?;
  }

  Future<List<Map<String, dynamic>>> getAds() async {
    final res = await http.get(
      Uri.parse('$_base/api/advertiser/ads'),
      headers: await _headers(),
    );
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['ads'] as List<dynamic>? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>?> getAd(String adId) async {
    final res = await http.get(
      Uri.parse('$_base/api/advertiser/ads/$adId'),
      headers: await _headers(),
    );
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return data['ad'] as Map<String, dynamic>?;
  }

  /// Crea un anuncio. body: type, placement, title, linkUrl, durationDays (7|15|30), imageUrl o videoUrl, campaignName, description, linkType, etc.
  /// Devuelve { ad, payment: { url? o clientSecret? } } o null en error.
  Future<Map<String, dynamic>?> createAd(Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$_base/api/advertiser/ads'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    if (res.statusCode != 200 && res.statusCode != 201) return null;
    return jsonDecode(res.body) as Map<String, dynamic>?;
  }

  Future<bool> pauseAd(String adId, {required bool pause}) async {
    final res = await http.post(
      Uri.parse('$_base/api/advertiser/ads/$adId/pause'),
      headers: await _headers(),
      body: jsonEncode({'action': pause ? 'pause' : 'resume'}),
    );
    return res.statusCode == 200;
  }

  Future<List<Map<String, dynamic>>> getPaymentMethods() async {
    final res = await http.get(
      Uri.parse('$_base/api/advertiser/billing/payment-methods'),
      headers: await _headers(),
    );
    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['paymentMethods'] as List<dynamic>? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<String?> createSetupSession({required String methodType}) async {
    final res = await http.post(
      Uri.parse('$_base/api/advertiser/billing/setup-session'),
      headers: await _headers(),
      body: jsonEncode({'methodType': methodType}),
    );
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return data['url'] as String?;
  }

  Future<bool> setDefaultPaymentMethod(String paymentMethodId) async {
    final res = await http.post(
      Uri.parse('$_base/api/advertiser/billing/payment-methods/default'),
      headers: await _headers(),
      body: jsonEncode({'paymentMethodId': paymentMethodId}),
    );
    return res.statusCode == 200;
  }

  Future<bool> detachPaymentMethod(String paymentMethodId) async {
    final res = await http.post(
      Uri.parse('$_base/api/advertiser/billing/payment-methods/detach'),
      headers: await _headers(),
      body: jsonEncode({'paymentMethodId': paymentMethodId}),
    );
    return res.statusCode == 200;
  }
}


