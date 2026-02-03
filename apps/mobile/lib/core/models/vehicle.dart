/// Modelo de Vehículo
class Vehicle {
  final String id;
  final String tenantId;
  final String make;
  final String model;
  final int year;
  final String? color;
  final String? vin;
  final String? plate;
  final double price;
  final String status; // available, sold, reserved
  final String? description;
  final List<String> photos;
  final Map<String, dynamic>? specifications;
  final DateTime createdAt;
  final DateTime updatedAt;

  Vehicle({
    required this.id,
    required this.tenantId,
    required this.make,
    required this.model,
    required this.year,
    this.color,
    this.vin,
    this.plate,
    required this.price,
    required this.status,
    this.description,
    required this.photos,
    this.specifications,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Vehicle.fromFirestore(Map<String, dynamic> data, String id) {
    return Vehicle(
      id: id,
      tenantId: data['tenantId'] ?? '',
      make: data['make'] ?? '',
      model: data['model'] ?? '',
      year: data['year'] ?? DateTime.now().year,
      color: data['color'],
      vin: data['vin'],
      plate: data['plate'],
      price: (data['price'] ?? 0).toDouble(),
      status: data['status'] ?? 'available',
      description: data['description'],
      photos: List<String>.from(data['photos'] ?? []),
      specifications: data['specifications'],
      createdAt: _parseTimestamp(data['createdAt']),
      updatedAt: _parseTimestamp(data['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'tenantId': tenantId,
      'make': make,
      'model': model,
      'year': year,
      'color': color,
      'vin': vin,
      'plate': plate,
      'price': price,
      'status': status,
      'description': description,
      'photos': photos,
      'specifications': specifications,
    };
  }

  static DateTime _parseTimestamp(dynamic timestamp) {
    if (timestamp == null) return DateTime.now();
    if (timestamp is DateTime) return timestamp;
    if (timestamp is String) return DateTime.parse(timestamp);
    return DateTime.now();
  }

  String get displayName => '$year $make $model';
}


