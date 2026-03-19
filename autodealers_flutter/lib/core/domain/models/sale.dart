// Modelo de Venta - Domain Layer
import 'package:cloud_firestore/cloud_firestore.dart';

enum SaleStatus {
  pending,
  completed,
  cancelled,
}

class BuyerInfo {
  final String fullName;
  final String phone;
  final String email;
  final Address? address;
  final String? driverLicenseNumber;
  final String? vehiclePlate;

  BuyerInfo({
    required this.fullName,
    required this.phone,
    required this.email,
    this.address,
    this.driverLicenseNumber,
    this.vehiclePlate,
  });

  factory BuyerInfo.fromJson(Map<String, dynamic> json) {
    return BuyerInfo(
      fullName: json['fullName'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String,
      address: json['address'] != null
          ? Address.fromJson(json['address'] as Map<String, dynamic>)
          : null,
      driverLicenseNumber: json['driverLicenseNumber'] as String?,
      vehiclePlate: json['vehiclePlate'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'phone': phone,
      'email': email,
      'address': address?.toJson(),
      'driverLicenseNumber': driverLicenseNumber,
      'vehiclePlate': vehiclePlate,
    };
  }
}

class Address {
  final String? street;
  final String? city;
  final String? state;
  final String? zipCode;
  final String? country;

  Address({
    this.street,
    this.city,
    this.state,
    this.zipCode,
    this.country,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      street: json['street'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      zipCode: json['zipCode'] as String?,
      country: json['country'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'street': street,
      'city': city,
      'state': state,
      'zipCode': zipCode,
      'country': country,
    };
  }
}

class Sale {
  final String id;
  final String tenantId;
  final String? leadId;
  final String vehicleId;
  final String sellerId;
  final BuyerInfo? buyer;
  final bool? enableReminders;
  final List<String>? selectedReminders;
  final double salePrice;
  final double vehiclePrice;
  final double? bonus1;
  final double? bonus2;
  final double? rebate;
  final double? tablilla;
  final double? insurance;
  final double? accessories;
  final double? other;
  final double total;
  final String currency;
  final double? vehicleCommissionRate;
  final double? vehicleCommission;
  final double? insuranceCommissionRate;
  final double? insuranceCommission;
  final double? accessoriesCommissionRate;
  final double? accessoriesCommission;
  final double? totalCommission;
  final String paymentMethod;
  final SaleStatus status;
  final List<String> documents;
  final String notes;
  final DateTime createdAt;
  final DateTime? completedAt;

  Sale({
    required this.id,
    required this.tenantId,
    this.leadId,
    required this.vehicleId,
    required this.sellerId,
    this.buyer,
    this.enableReminders,
    this.selectedReminders,
    required this.salePrice,
    required this.vehiclePrice,
    this.bonus1,
    this.bonus2,
    this.rebate,
    this.tablilla,
    this.insurance,
    this.accessories,
    this.other,
    required this.total,
    required this.currency,
    this.vehicleCommissionRate,
    this.vehicleCommission,
    this.insuranceCommissionRate,
    this.insuranceCommission,
    this.accessoriesCommissionRate,
    this.accessoriesCommission,
    this.totalCommission,
    required this.paymentMethod,
    required this.status,
    required this.documents,
    required this.notes,
    required this.createdAt,
    this.completedAt,
  });

  factory Sale.fromJson(Map<String, dynamic> json) {
    return Sale(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      leadId: json['leadId'] as String?,
      vehicleId: json['vehicleId'] as String,
      sellerId: json['sellerId'] as String,
      buyer: json['buyer'] != null
          ? BuyerInfo.fromJson(json['buyer'] as Map<String, dynamic>)
          : null,
      enableReminders: json['enableReminders'] as bool?,
      selectedReminders: json['selectedReminders'] != null
          ? List<String>.from(json['selectedReminders'] as List)
          : null,
      salePrice: (json['salePrice'] as num).toDouble(),
      vehiclePrice: (json['vehiclePrice'] as num).toDouble(),
      bonus1: json['bonus1'] != null ? (json['bonus1'] as num).toDouble() : null,
      bonus2: json['bonus2'] != null ? (json['bonus2'] as num).toDouble() : null,
      rebate: json['rebate'] != null ? (json['rebate'] as num).toDouble() : null,
      tablilla: json['tablilla'] != null ? (json['tablilla'] as num).toDouble() : null,
      insurance: json['insurance'] != null ? (json['insurance'] as num).toDouble() : null,
      accessories: json['accessories'] != null ? (json['accessories'] as num).toDouble() : null,
      other: json['other'] != null ? (json['other'] as num).toDouble() : null,
      total: (json['total'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'USD',
      vehicleCommissionRate: json['vehicleCommissionRate'] != null
          ? (json['vehicleCommissionRate'] as num).toDouble()
          : null,
      vehicleCommission: json['vehicleCommission'] != null
          ? (json['vehicleCommission'] as num).toDouble()
          : null,
      insuranceCommissionRate: json['insuranceCommissionRate'] != null
          ? (json['insuranceCommissionRate'] as num).toDouble()
          : null,
      insuranceCommission: json['insuranceCommission'] != null
          ? (json['insuranceCommission'] as num).toDouble()
          : null,
      accessoriesCommissionRate: json['accessoriesCommissionRate'] != null
          ? (json['accessoriesCommissionRate'] as num).toDouble()
          : null,
      accessoriesCommission: json['accessoriesCommission'] != null
          ? (json['accessoriesCommission'] as num).toDouble()
          : null,
      totalCommission: json['totalCommission'] != null
          ? (json['totalCommission'] as num).toDouble()
          : null,
      paymentMethod: json['paymentMethod'] as String,
      status: SaleStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => SaleStatus.pending,
      ),
      documents: List<String>.from(json['documents'] as List? ?? []),
      notes: json['notes'] as String? ?? '',
      createdAt: json['createdAt'] is Timestamp
          ? (json['createdAt'] as Timestamp).toDate()
          : DateTime.parse(json['createdAt'].toString()),
      completedAt: json['completedAt'] != null
          ? (json['completedAt'] is Timestamp
              ? (json['completedAt'] as Timestamp).toDate()
              : DateTime.parse(json['completedAt'].toString()))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'leadId': leadId,
      'vehicleId': vehicleId,
      'sellerId': sellerId,
      'buyer': buyer?.toJson(),
      'enableReminders': enableReminders,
      'selectedReminders': selectedReminders,
      'salePrice': salePrice,
      'vehiclePrice': vehiclePrice,
      'bonus1': bonus1,
      'bonus2': bonus2,
      'rebate': rebate,
      'tablilla': tablilla,
      'insurance': insurance,
      'accessories': accessories,
      'other': other,
      'total': total,
      'currency': currency,
      'vehicleCommissionRate': vehicleCommissionRate,
      'vehicleCommission': vehicleCommission,
      'insuranceCommissionRate': insuranceCommissionRate,
      'insuranceCommission': insuranceCommission,
      'accessoriesCommissionRate': accessoriesCommissionRate,
      'accessoriesCommission': accessoriesCommission,
      'totalCommission': totalCommission,
      'paymentMethod': paymentMethod,
      'status': status.name,
      'documents': documents,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
      'completedAt': completedAt != null ? Timestamp.fromDate(completedAt!) : null,
    };
  }

  // Getters de compatibilidad
  DateTime get date => createdAt;
  double get totalAmount => total;
  
  // Método helper para obtener información del vehículo desde metadata
  String? get vehicleMake {
    // Se obtiene del vehículo asociado, no del modelo Sale directamente
    return null;
  }
  
  String? get vehicleModel {
    // Se obtiene del vehículo asociado, no del modelo Sale directamente
    return null;
  }
}


