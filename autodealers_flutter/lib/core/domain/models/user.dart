// Modelo de Usuario - Domain Layer
import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole {
  admin,
  masterDealer,
  dealer,
  seller,
  advertiser,
  manager,
  dealerAdmin,
}

enum UserStatus {
  active,
  suspended,
  cancelled,
}

enum TenantType {
  dealer,
  seller,
}

class User {
  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String? tenantId;
  final String? dealerId;
  final String membershipId;
  final TenantType membershipType;
  final UserStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastLogin;
  final String? phone;
  final Map<String, dynamic> settings;
  final String? corporateEmail;
  final String? emailSignature;
  final String? emailSignatureType;
  final int? emailAliases;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.tenantId,
    this.dealerId,
    required this.membershipId,
    required this.membershipType,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.lastLogin,
    this.phone,
    required this.settings,
    this.corporateEmail,
    this.emailSignature,
    this.emailSignatureType,
    this.emailAliases,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: UserRole.values.firstWhere(
        (e) => e.name == json['role'],
        orElse: () => UserRole.seller,
      ),
      tenantId: json['tenantId'] as String?,
      dealerId: json['dealerId'] as String?,
      membershipId: json['membershipId'] as String,
      membershipType: TenantType.values.firstWhere(
        (e) => e.name == json['membershipType'],
        orElse: () => TenantType.seller,
      ),
      status: UserStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => UserStatus.active,
      ),
      createdAt: json['createdAt'] is Timestamp
          ? (json['createdAt'] as Timestamp).toDate()
          : DateTime.parse(json['createdAt'].toString()),
      updatedAt: json['updatedAt'] is Timestamp
          ? (json['updatedAt'] as Timestamp).toDate()
          : DateTime.parse(json['updatedAt'].toString()),
      lastLogin: json['lastLogin'] != null
          ? (json['lastLogin'] is Timestamp
              ? (json['lastLogin'] as Timestamp).toDate()
              : DateTime.parse(json['lastLogin'].toString()))
          : null,
      phone: json['phone'] as String?,
      settings: json['settings'] as Map<String, dynamic>? ?? {},
      corporateEmail: json['corporateEmail'] as String?,
      emailSignature: json['emailSignature'] as String?,
      emailSignatureType: json['emailSignatureType'] as String?,
      emailAliases: json['emailAliases'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role.name,
      'tenantId': tenantId,
      'dealerId': dealerId,
      'membershipId': membershipId,
      'membershipType': membershipType.name,
      'status': status.name,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'lastLogin': lastLogin != null ? Timestamp.fromDate(lastLogin!) : null,
      'phone': phone,
      'settings': settings,
      'corporateEmail': corporateEmail,
      'emailSignature': emailSignature,
      'emailSignatureType': emailSignatureType,
      'emailAliases': emailAliases,
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? name,
    UserRole? role,
    String? tenantId,
    String? dealerId,
    String? membershipId,
    TenantType? membershipType,
    UserStatus? status,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastLogin,
    String? phone,
    Map<String, dynamic>? settings,
    String? corporateEmail,
    String? emailSignature,
    String? emailSignatureType,
    int? emailAliases,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      tenantId: tenantId ?? this.tenantId,
      dealerId: dealerId ?? this.dealerId,
      membershipId: membershipId ?? this.membershipId,
      membershipType: membershipType ?? this.membershipType,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastLogin: lastLogin ?? this.lastLogin,
      phone: phone ?? this.phone,
      settings: settings ?? this.settings,
      corporateEmail: corporateEmail ?? this.corporateEmail,
      emailSignature: emailSignature ?? this.emailSignature,
      emailSignatureType: emailSignatureType ?? this.emailSignatureType,
      emailAliases: emailAliases ?? this.emailAliases,
    );
  }
}


