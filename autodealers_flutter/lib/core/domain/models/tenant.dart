// Modelo de Tenant (Dealer/Seller) - Domain Layer
import 'user.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class Tenant {
  final String id;
  final String name;
  final TenantType type;
  final String? companyName;
  final String? subdomain;
  final String? domain;
  final String? membershipId;
  final String? status;
  final bool? approvedByAdmin;
  final String? fiManagerId;
  final String? fiManagerPhone;
  final String? fiManagerEmail;
  final TenantBranding branding;
  final Map<String, dynamic> settings;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int? corporateEmailsUsed;
  final String? corporateEmailDomain;
  final int? emailAliases;
  final int? aliasesUsed;

  Tenant({
    required this.id,
    required this.name,
    required this.type,
    this.companyName,
    this.subdomain,
    this.domain,
    this.membershipId,
    this.status,
    this.approvedByAdmin,
    this.fiManagerId,
    this.fiManagerPhone,
    this.fiManagerEmail,
    required this.branding,
    required this.settings,
    required this.createdAt,
    required this.updatedAt,
    this.corporateEmailsUsed,
    this.corporateEmailDomain,
    this.emailAliases,
    this.aliasesUsed,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: json['id'] as String,
      name: json['name'] as String,
      type: TenantType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => TenantType.seller,
      ),
      companyName: json['companyName'] as String?,
      subdomain: json['subdomain'] as String?,
      domain: json['domain'] as String?,
      membershipId: json['membershipId'] as String?,
      status: json['status'] as String?,
      approvedByAdmin: json['approvedByAdmin'] as bool?,
      fiManagerId: json['fiManagerId'] as String?,
      fiManagerPhone: json['fiManagerPhone'] as String?,
      fiManagerEmail: json['fiManagerEmail'] as String?,
      branding: TenantBranding.fromJson(json['branding'] as Map<String, dynamic>),
      settings: json['settings'] as Map<String, dynamic>? ?? {},
      createdAt: (json['createdAt'] as Timestamp).toDate(),
      updatedAt: (json['updatedAt'] as Timestamp).toDate(),
      corporateEmailsUsed: json['corporateEmailsUsed'] as int?,
      corporateEmailDomain: json['corporateEmailDomain'] as String?,
      emailAliases: json['emailAliases'] as int?,
      aliasesUsed: json['aliasesUsed'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type.name,
      'companyName': companyName,
      'subdomain': subdomain,
      'domain': domain,
      'membershipId': membershipId,
      'status': status,
      'approvedByAdmin': approvedByAdmin,
      'fiManagerId': fiManagerId,
      'fiManagerPhone': fiManagerPhone,
      'fiManagerEmail': fiManagerEmail,
      'branding': branding.toJson(),
      'settings': settings,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'corporateEmailsUsed': corporateEmailsUsed,
      'corporateEmailDomain': corporateEmailDomain,
      'emailAliases': emailAliases,
      'aliasesUsed': aliasesUsed,
    };
  }
}

class TenantBranding {
  final String? logo;
  final String? logoUrl;
  final String? favicon;
  final String? faviconUrl;
  final String primaryColor;
  final String secondaryColor;

  TenantBranding({
    this.logo,
    this.logoUrl,
    this.favicon,
    this.faviconUrl,
    required this.primaryColor,
    required this.secondaryColor,
  });

  factory TenantBranding.fromJson(Map<String, dynamic> json) {
    return TenantBranding(
      logo: json['logo'] as String?,
      logoUrl: json['logoUrl'] as String?,
      favicon: json['favicon'] as String?,
      faviconUrl: json['faviconUrl'] as String?,
      primaryColor: json['primaryColor'] as String? ?? '#000000',
      secondaryColor: json['secondaryColor'] as String? ?? '#FFFFFF',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'logo': logo,
      'logoUrl': logoUrl,
      'favicon': favicon,
      'faviconUrl': faviconUrl,
      'primaryColor': primaryColor,
      'secondaryColor': secondaryColor,
    };
  }
}


