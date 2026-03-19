// Modelo de Vehículo - Domain Layer
import 'package:cloud_firestore/cloud_firestore.dart';

DateTime _parseTimestamp(dynamic value) {
  if (value == null) return DateTime.now();
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  if (value is String) {
    try {
      return DateTime.parse(value);
    } catch (e) {
      return DateTime.now();
    }
  }
  return DateTime.now();
}

/// Parsea fotos desde JSON: acepta 'photos', 'images', 'imageUrls', 'photoUrls'; o un solo 'imageUrl'/'photo'.
List<String> _parsePhotos(Map<String, dynamic> json) {
  var raw = json['photos'] ?? json['images'] ?? json['imageUrls'] ?? json['photoUrls'];
  if (raw == null) {
    final single = json['imageUrl'] ?? json['photo'] ?? json['mainPhoto'];
    if (single is String && single.trim().isNotEmpty) return [single.trim()];
    return [];
  }
  if (raw is String && raw.trim().isNotEmpty) return [raw.trim()];
  if (raw is! List) return [];
  final out = <String>[];
  for (final e in raw) {
    if (e == null) continue;
    if (e is String && e.trim().isNotEmpty) {
      out.add(e.trim());
    } else if (e is Map) {
      final url = e['url'] ?? e['src'] ?? e['path'];
      if (url is String && url.trim().isNotEmpty) out.add(url.trim());
    }
  }
  return out;
}

enum VehicleCondition {
  new_,
  used,
  certified,
}

enum VehicleStatus {
  available,
  reserved,
  sold,
}

enum VehicleBodyType {
  suv,
  sedan,
  pickupTruck,
  coupe,
  hatchback,
  wagon,
  convertible,
  minivan,
  van,
  electric,
  hybrid,
  plugInHybrid,
  luxury,
  crossover,
}

enum TransmissionType {
  automatic,
  manual,
  cvt,
}

enum FuelType {
  gasoline,
  diesel,
  electric,
  hybrid,
  plugInHybrid,
}

enum CommissionType {
  percentage,
  fixed,
}

class Vehicle {
  final String id;
  final String tenantId;
  final String? sellerId;
  final String? assignedTo;
  final String make;
  final String model;
  final int year;
  final double price;
  final String currency;
  final int? mileage;
  final VehicleCondition condition;
  final VehicleStatus status;
  final String description;
  final List<String> photos;
  final List<String>? videos;
  final VehicleSpecs specifications;
  final String? vin;
  final String? stockNumber;
  final VehicleBodyType? bodyType;
  final CommissionType? sellerCommissionType;
  final double? sellerCommissionRate;
  final double? sellerCommissionFixed;
  final CommissionType? insuranceCommissionType;
  final double? insuranceCommissionRate;
  final double? insuranceCommissionFixed;
  final CommissionType? accessoriesCommissionType;
  final double? accessoriesCommissionRate;
  final double? accessoriesCommissionFixed;
  final bool? publishedOnPublicPage;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? soldAt;

  Vehicle({
    required this.id,
    required this.tenantId,
    this.sellerId,
    this.assignedTo,
    required this.make,
    required this.model,
    required this.year,
    required this.price,
    required this.currency,
    this.mileage,
    required this.condition,
    required this.status,
    required this.description,
    required this.photos,
    this.videos,
    required this.specifications,
    this.vin,
    this.stockNumber,
    this.bodyType,
    this.sellerCommissionType,
    this.sellerCommissionRate,
    this.sellerCommissionFixed,
    this.insuranceCommissionType,
    this.insuranceCommissionRate,
    this.insuranceCommissionFixed,
    this.accessoriesCommissionType,
    this.accessoriesCommissionRate,
    this.accessoriesCommissionFixed,
    this.publishedOnPublicPage,
    required this.createdAt,
    required this.updatedAt,
    this.soldAt,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      sellerId: json['sellerId'] as String?,
      assignedTo: json['assignedTo'] as String?,
      make: json['make'] as String,
      model: json['model'] as String,
      year: json['year'] as int,
      price: (json['price'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      mileage: json['mileage'] as int?,
      condition: VehicleCondition.values.firstWhere(
        (e) => e.name == json['condition']?.replaceAll('_', ''),
        orElse: () => VehicleCondition.used,
      ),
      status: VehicleStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => VehicleStatus.available,
      ),
      description: json['description'] as String? ?? '',
      photos: _parsePhotos(json),
      videos: json['videos'] != null ? List<String>.from(json['videos'] as List) : null,
      specifications: VehicleSpecs.fromJson(json['specifications'] as Map<String, dynamic>),
      vin: json['vin'] as String?,
      stockNumber: json['stockNumber'] as String?,
      bodyType: json['bodyType'] != null
          ? VehicleBodyType.values.firstWhere(
              (e) => e.name == json['bodyType']?.replaceAll('-', ''),
              orElse: () => VehicleBodyType.sedan,
            )
          : null,
      sellerCommissionType: json['sellerCommissionType'] != null
          ? CommissionType.values.firstWhere(
              (e) => e.name == json['sellerCommissionType'],
              orElse: () => CommissionType.percentage,
            )
          : null,
      sellerCommissionRate: json['sellerCommissionRate'] != null
          ? (json['sellerCommissionRate'] as num).toDouble()
          : null,
      sellerCommissionFixed: json['sellerCommissionFixed'] != null
          ? (json['sellerCommissionFixed'] as num).toDouble()
          : null,
      insuranceCommissionType: json['insuranceCommissionType'] != null
          ? CommissionType.values.firstWhere(
              (e) => e.name == json['insuranceCommissionType'],
              orElse: () => CommissionType.percentage,
            )
          : null,
      insuranceCommissionRate: json['insuranceCommissionRate'] != null
          ? (json['insuranceCommissionRate'] as num).toDouble()
          : null,
      insuranceCommissionFixed: json['insuranceCommissionFixed'] != null
          ? (json['insuranceCommissionFixed'] as num).toDouble()
          : null,
      accessoriesCommissionType: json['accessoriesCommissionType'] != null
          ? CommissionType.values.firstWhere(
              (e) => e.name == json['accessoriesCommissionType'],
              orElse: () => CommissionType.percentage,
            )
          : null,
      accessoriesCommissionRate: json['accessoriesCommissionRate'] != null
          ? (json['accessoriesCommissionRate'] as num).toDouble()
          : null,
      accessoriesCommissionFixed: json['accessoriesCommissionFixed'] != null
          ? (json['accessoriesCommissionFixed'] as num).toDouble()
          : null,
      publishedOnPublicPage: json['publishedOnPublicPage'] as bool?,
      createdAt: _parseTimestamp(json['createdAt']),
      updatedAt: _parseTimestamp(json['updatedAt']),
      soldAt: json['soldAt'] != null ? _parseTimestamp(json['soldAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'sellerId': sellerId,
      'assignedTo': assignedTo,
      'make': make,
      'model': model,
      'year': year,
      'price': price,
      'currency': currency,
      'mileage': mileage,
      'condition': condition.name.replaceAll('_', ''),
      'status': status.name,
      'description': description,
      'photos': photos,
      'videos': videos,
      'specifications': specifications.toJson(),
      'vin': vin,
      'stockNumber': stockNumber,
      'bodyType': bodyType?.name.replaceAll('_', '-'),
      'sellerCommissionType': sellerCommissionType?.name,
      'sellerCommissionRate': sellerCommissionRate,
      'sellerCommissionFixed': sellerCommissionFixed,
      'insuranceCommissionType': insuranceCommissionType?.name,
      'insuranceCommissionRate': insuranceCommissionRate,
      'insuranceCommissionFixed': insuranceCommissionFixed,
      'accessoriesCommissionType': accessoriesCommissionType?.name,
      'accessoriesCommissionRate': accessoriesCommissionRate,
      'accessoriesCommissionFixed': accessoriesCommissionFixed,
      'publishedOnPublicPage': publishedOnPublicPage,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'soldAt': soldAt,
    };
  }
}

class VehicleSpecs {
  final String make;
  final String model;
  final int year;
  final String? color;
  final int? mileage;
  final TransmissionType? transmission;
  final FuelType? fuelType;
  final String? engine;
  final int? doors;
  final int? seats;
  final String? vin;
  final String? stockNumber;
  final VehicleBodyType? bodyType;
  final Map<String, dynamic> additional;

  VehicleSpecs({
    required this.make,
    required this.model,
    required this.year,
    this.color,
    this.mileage,
    this.transmission,
    this.fuelType,
    this.engine,
    this.doors,
    this.seats,
    this.vin,
    this.stockNumber,
    this.bodyType,
    required this.additional,
  });

  factory VehicleSpecs.fromJson(Map<String, dynamic> json) {
    return VehicleSpecs(
      make: json['make'] as String,
      model: json['model'] as String,
      year: json['year'] as int,
      color: json['color'] as String?,
      mileage: json['mileage'] as int?,
      transmission: json['transmission'] != null
          ? TransmissionType.values.firstWhere(
              (e) => e.name == json['transmission'],
              orElse: () => TransmissionType.automatic,
            )
          : null,
      fuelType: json['fuelType'] != null
          ? FuelType.values.firstWhere(
              (e) => e.name == json['fuelType']?.replaceAll('-', ''),
              orElse: () => FuelType.gasoline,
            )
          : null,
      engine: json['engine'] as String?,
      doors: json['doors'] as int?,
      seats: json['seats'] as int?,
      vin: json['vin'] as String?,
      stockNumber: json['stockNumber'] as String?,
      bodyType: json['bodyType'] != null
          ? VehicleBodyType.values.firstWhere(
              (e) => e.name == json['bodyType']?.replaceAll('-', ''),
              orElse: () => VehicleBodyType.sedan,
            )
          : null,
      additional: Map<String, dynamic>.from(json)..removeWhere((k, v) => [
            'make', 'model', 'year', 'color', 'mileage', 'transmission',
            'fuelType', 'engine', 'doors', 'seats', 'vin', 'stockNumber', 'bodyType'
          ].contains(k)),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'make': make,
      'model': model,
      'year': year,
      'color': color,
      'mileage': mileage,
      'transmission': transmission?.name,
      'fuelType': fuelType?.name.replaceAll('_', '-'),
      'engine': engine,
      'doors': doors,
      'seats': seats,
      'vin': vin,
      'stockNumber': stockNumber,
      'bodyType': bodyType?.name.replaceAll('_', '-'),
      ...additional,
    };
  }
}


