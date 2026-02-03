/// Modelo de Venta
class Sale {
  final String id;
  final String tenantId;
  final String vehicleId;
  final String? leadId;
  final String? sellerId;
  final double salePrice;
  final double? vehiclePrice;
  final DateTime saleDate;
  final DateTime createdAt;
  final String status; // pending, completed, cancelled
  final SaleBuyer? buyer;
  final bool enableReminders;
  final List<String>? selectedReminders;

  Sale({
    required this.id,
    required this.tenantId,
    required this.vehicleId,
    this.leadId,
    this.sellerId,
    required this.salePrice,
    this.vehiclePrice,
    required this.saleDate,
    required this.createdAt,
    required this.status,
    this.buyer,
    required this.enableReminders,
    this.selectedReminders,
  });

  factory Sale.fromFirestore(Map<String, dynamic> data, String id) {
    return Sale(
      id: id,
      tenantId: data['tenantId'] ?? '',
      vehicleId: data['vehicleId'] ?? '',
      leadId: data['leadId'],
      sellerId: data['sellerId'],
      salePrice: (data['salePrice'] ?? data['price'] ?? 0).toDouble(),
      vehiclePrice: data['vehiclePrice']?.toDouble(),
      saleDate: _parseTimestamp(data['saleDate'] ?? data['createdAt']),
      createdAt: _parseTimestamp(data['createdAt']),
      status: data['status'] ?? 'completed',
      buyer: data['buyer'] != null
          ? SaleBuyer.fromMap(data['buyer'])
          : null,
      enableReminders: data['enableReminders'] ?? false,
      selectedReminders: data['selectedReminders'] != null
          ? List<String>.from(data['selectedReminders'])
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'tenantId': tenantId,
      'vehicleId': vehicleId,
      'leadId': leadId,
      'sellerId': sellerId,
      'salePrice': salePrice,
      'vehiclePrice': vehiclePrice,
      'saleDate': saleDate.toIso8601String(),
      'status': status,
      'buyer': buyer?.toMap(),
      'enableReminders': enableReminders,
      'selectedReminders': selectedReminders,
    };
  }

  static DateTime _parseTimestamp(dynamic timestamp) {
    if (timestamp == null) return DateTime.now();
    if (timestamp is DateTime) return timestamp;
    if (timestamp is String) return DateTime.parse(timestamp);
    return DateTime.now();
  }
}

class SaleBuyer {
  final String fullName;
  final String phone;
  final String? email;
  final String? address;
  final String? driverLicenseNumber;
  final String? vehiclePlate;

  SaleBuyer({
    required this.fullName,
    required this.phone,
    this.email,
    this.address,
    this.driverLicenseNumber,
    this.vehiclePlate,
  });

  factory SaleBuyer.fromMap(Map<String, dynamic> map) {
    return SaleBuyer(
      fullName: map['fullName'] ?? '',
      phone: map['phone'] ?? '',
      email: map['email'],
      address: map['address'],
      driverLicenseNumber: map['driverLicenseNumber'],
      vehiclePlate: map['vehiclePlate'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'fullName': fullName,
      'phone': phone,
      'email': email,
      'address': address,
      'driverLicenseNumber': driverLicenseNumber,
      'vehiclePlate': vehiclePlate,
    };
  }
}


