/// Roles del sistema
enum UserRole {
  admin,
  dealer,
  seller,
}

/// Extension para obtener el nombre del rol
extension UserRoleExtension on UserRole {
  String get name {
    switch (this) {
      case UserRole.admin:
        return 'Administrador';
      case UserRole.dealer:
        return 'Dealer';
      case UserRole.seller:
        return 'Vendedor';
    }
  }

  String get value {
    switch (this) {
      case UserRole.admin:
        return 'admin';
      case UserRole.dealer:
        return 'dealer';
      case UserRole.seller:
        return 'seller';
    }
  }

  static UserRole? fromString(String? value) {
    switch (value) {
      case 'admin':
        return UserRole.admin;
      case 'dealer':
        return UserRole.dealer;
      case 'seller':
        return UserRole.seller;
      default:
        return null;
    }
  }
}

/// Permisos del sistema
class Permissions {
  final UserRole role;
  final String? tenantId;
  final String? dealerId;

  Permissions({
    required this.role,
    this.tenantId,
    this.dealerId,
  });

  // Permisos de Admin
  bool get canManageUsers => role == UserRole.admin;
  bool get canManageTenants => role == UserRole.admin;
  bool get canManageMemberships => role == UserRole.admin;
  bool get canViewAllLeads => role == UserRole.admin;
  bool get canViewAllVehicles => role == UserRole.admin;
  bool get canViewAllSales => role == UserRole.admin;
  bool get canViewAllCampaigns => role == UserRole.admin;
  bool get canViewAllPromotions => role == UserRole.admin;
  bool get canViewAllReviews => role == UserRole.admin;
  bool get canViewAllIntegrations => role == UserRole.admin;
  bool get canViewLogs => role == UserRole.admin;
  bool get canManageDynamicFeatures => role == UserRole.admin;
  bool get canManageCommunicationTemplates => role == UserRole.admin;

  // Permisos de Dealer
  bool get canManageSellers => role == UserRole.dealer;
  bool get canViewSellerActivity => role == UserRole.dealer;
  bool get canManageDealers => role == UserRole.dealer;
  bool get canManageAdminUsers => role == UserRole.dealer;
  bool get canViewReminders => role == UserRole.dealer || role == UserRole.seller;

  // Permisos compartidos (Dealer y Seller)
  bool get canManageLeads => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageInventory => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageSales => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageAppointments => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageMessages => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageCampaigns => role == UserRole.dealer || role == UserRole.seller;
  bool get canManagePromotions => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageReviews => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageCustomerFiles => role == UserRole.dealer || role == UserRole.seller;
  bool get canViewReports => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageSettings => role == UserRole.dealer || role == UserRole.seller;
  bool get canManageSubUsers => role == UserRole.dealer || role == UserRole.seller;
}

