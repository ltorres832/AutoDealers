import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/firestore_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/models/user_role.dart';

/// Servicio para obtener datos del dashboard según el rol
class DashboardService {
  final FirestoreService _firestore = FirestoreService();
  final AuthService _auth = AuthService();

  /// Obtiene estadísticas del dashboard para Dealer
  Future<Map<String, dynamic>> getDealerStats() async {
    final permissions = await _auth.getPermissions();
    if (permissions == null || permissions.role != UserRole.dealer) {
      throw Exception('No autorizado');
    }

    final tenantId = await _firestore.currentTenantId;
    if (tenantId == null) throw Exception('No tenant ID');

    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));

    // Obtener datos en paralelo
    final leadsSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .limit(50)
        .get();

    final vehiclesSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();

    final salesSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfMonth))
        .where('status', isEqualTo: 'completed')
        .get();

    final appointmentsSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .where('scheduledAt', isGreaterThanOrEqualTo: Timestamp.fromDate(today))
        .where('scheduledAt', isLessThan: Timestamp.fromDate(tomorrow))
        .where('status', whereIn: ['scheduled', 'confirmed'])
        .get();

    final messagesSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .limit(50)
        .get();

    final sellersSnapshot = await FirebaseFirestore.instance
        .collection('users')
        .where('tenantId', isEqualTo: tenantId)
        .where('role', isEqualTo: 'seller')
        .get();

    // Procesar datos
    final leads = leadsSnapshot.docs;
    final vehicles = vehiclesSnapshot.docs;
    final sales = salesSnapshot.docs;
    final sellers = sellersSnapshot.docs;

    final activeLeads = leads.where((doc) {
      final status = doc.data()['status'];
      return status != 'closed' && status != 'lost';
    }).length;

    final availableVehicles = vehicles.where((doc) {
      return doc.data()['status'] == 'available';
    }).length;

    final monthlyRevenue = sales.fold<double>(0, (sum, doc) {
      final data = doc.data();
      return sum + ((data['salePrice'] ?? data['total'] ?? 0) as num).toDouble();
    });

    final unreadMessages = messagesSnapshot.docs.where((doc) {
      return doc.data()['status'] != 'read';
    }).length;

    // Top vendedores
    final salesBySeller = <String, Map<String, dynamic>>{};
    for (final sale in sales) {
      final sellerId = sale.data()['sellerId'];
      if (sellerId != null) {
        salesBySeller.putIfAbsent(sellerId, () => {'sales': 0, 'revenue': 0.0});
        final salePrice = ((sale.data()['salePrice'] ?? sale.data()['total'] ?? 0) as num).toDouble();
        salesBySeller[sellerId]!['sales'] = (salesBySeller[sellerId]!['sales'] as int) + 1;
        salesBySeller[sellerId]!['revenue'] = (salesBySeller[sellerId]!['revenue'] as double) + salePrice;
      }
    }

    final topSellers = sellers.map((seller) {
      final sellerId = seller.id;
      final sellerData = salesBySeller[sellerId] ?? {'sales': 0, 'revenue': 0.0};
      return {
        'id': sellerId,
        'name': seller.data()['name'] ?? '',
        'sales': sellerData['sales'],
        'revenue': sellerData['revenue'],
      };
    }).toList()
      ..sort((a, b) => (b['revenue'] as double).compareTo(a['revenue'] as double));

    return {
      'stats': {
        'totalLeads': leads.length,
        'activeLeads': activeLeads,
        'totalVehicles': vehicles.length,
        'availableVehicles': availableVehicles,
        'totalSales': sales.length,
        'monthlyRevenue': monthlyRevenue,
        'appointmentsToday': appointmentsSnapshot.size,
        'unreadMessages': unreadMessages,
        'totalSellers': sellers.length,
        'sellersSales': sales.where((s) => s.data()['sellerId'] != null).length,
      },
      'topSellers': topSellers.take(5).toList(),
    };
  }

  /// Obtiene estadísticas del dashboard para Seller
  Future<Map<String, dynamic>> getSellerStats() async {
    try {
      final permissions = await _auth.getPermissions();
      if (permissions == null || permissions.role != UserRole.seller) {
        throw Exception('No autorizado');
      }

      final user = _auth.currentUser;
      if (user == null) throw Exception('No autenticado');

      final tenantId = await _firestore.currentTenantId;
      if (tenantId == null) throw Exception('No tenant ID');

    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    // Calcular inicio de semana (lunes)
    final daysFromMonday = now.weekday - 1;
    final startOfWeek = startOfDay.subtract(Duration(days: daysFromMonday));
    final startOfMonth = DateTime(now.year, now.month, 1);

    // Obtener leads del vendedor
    final myLeadsSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('leads')
        .where('sellerId', isEqualTo: user.uid)
        .get();

    // Obtener ventas del vendedor
    final mySalesSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('sales')
        .where('sellerId', isEqualTo: user.uid)
        .get();

    final myLeads = myLeadsSnapshot.docs;
    final mySales = mySalesSnapshot.docs;

    final activeLeads = myLeads.where((doc) {
      final status = doc.data()['status'];
      return status != 'closed' && status != 'lost';
    }).length;

    final myRevenue = mySales.fold<double>(0, (sum, doc) {
      final data = doc.data();
      return sum + ((data['salePrice'] ?? data['total'] ?? 0) as num).toDouble();
    });

    final dailySales = mySales.where((doc) {
      final createdAt = (doc.data()['createdAt'] as Timestamp?)?.toDate();
      return createdAt != null && createdAt.isAfter(startOfDay);
    }).length;

    final weeklySales = mySales.where((doc) {
      final createdAt = (doc.data()['createdAt'] as Timestamp?)?.toDate();
      return createdAt != null && createdAt.isAfter(startOfWeek);
    }).length;

    final monthlySales = mySales.where((doc) {
      final createdAt = (doc.data()['createdAt'] as Timestamp?)?.toDate();
      return createdAt != null && createdAt.isAfter(startOfMonth);
    }).length;

    final dailyRevenue = mySales.where((doc) {
      final createdAt = (doc.data()['createdAt'] as Timestamp?)?.toDate();
      return createdAt != null && createdAt.isAfter(startOfDay);
    }).fold<double>(0, (sum, doc) {
      final data = doc.data();
      return sum + ((data['salePrice'] ?? data['total'] ?? 0) as num).toDouble();
    });

    final weeklyRevenue = mySales.where((doc) {
      final createdAt = (doc.data()['createdAt'] as Timestamp?)?.toDate();
      return createdAt != null && createdAt.isAfter(startOfWeek);
    }).fold<double>(0, (sum, doc) {
      final data = doc.data();
      return sum + ((data['salePrice'] ?? data['total'] ?? 0) as num).toDouble();
    });

    final conversionRate = myLeads.isEmpty
        ? 0.0
        : (mySales.length / myLeads.length) * 100;

    // Obtener citas de hoy
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final appointmentsSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .where('sellerId', isEqualTo: user.uid)
        .where('scheduledAt', isGreaterThanOrEqualTo: Timestamp.fromDate(today))
        .where('scheduledAt', isLessThan: Timestamp.fromDate(tomorrow))
        .where('status', whereIn: ['scheduled', 'confirmed'])
        .get();

    // Obtener mensajes no leídos
    final messagesSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('messages')
        .where('sellerId', isEqualTo: user.uid)
        .limit(50)
        .get();

    final unreadMessages = messagesSnapshot.docs.where((doc) {
      return doc.data()['status'] != 'read';
    }).length;

    // Obtener vehículos disponibles
    final vehiclesSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .where('status', isEqualTo: 'available')
        .get();

    // Leads recientes
    final recentLeadsData = myLeads
        .take(5)
        .map((doc) {
          final data = doc.data();
          return {
            'id': doc.id,
            'name': data['contact']?['name'] ?? '',
            'source': data['source'] ?? '',
            'status': data['status'] ?? 'new',
            'createdAt': (data['createdAt'] as Timestamp?)?.toDate().toIso8601String() ?? DateTime.now().toIso8601String(),
          };
        })
        .toList();

    // Ventas recientes
    final recentSalesData = mySales
        .take(10)
        .map((doc) {
          try {
            final data = doc.data();
            final buyer = data['buyer'];
            final price = (data['salePrice'] ?? data['total'] ?? 0);
            return {
              'id': doc.id,
              'vehicle': data['vehicleId'] ?? 'Vehículo',
              'customerName': (buyer is Map && buyer['fullName'] != null) ? buyer['fullName'] : 'Cliente',
              'price': (price is num) ? price : 0,
              'createdAt': (data['createdAt'] is Timestamp)
                  ? (data['createdAt'] as Timestamp).toDate().toIso8601String()
                  : DateTime.now().toIso8601String(),
            };
          } catch (e) {
            print('Error procesando venta ${doc.id}: $e');
            return {
              'id': doc.id,
              'vehicle': 'Vehículo',
              'customerName': 'Cliente',
              'price': 0,
              'createdAt': DateTime.now().toIso8601String(),
            };
          }
        })
        .toList();

    // Citas próximas
    final nextWeek = now.add(const Duration(days: 7));
    final upcomingAppointmentsSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .doc(tenantId)
        .collection('appointments')
        .where('sellerId', isEqualTo: user.uid)
        .where('scheduledAt', isGreaterThanOrEqualTo: Timestamp.fromDate(now))
        .where('scheduledAt', isLessThanOrEqualTo: Timestamp.fromDate(nextWeek))
        .where('status', whereIn: ['scheduled', 'confirmed'])
        .orderBy('scheduledAt', descending: false)
        .limit(5)
        .get();

    final upcomingAppointmentsData = upcomingAppointmentsSnapshot.docs
        .map((doc) {
          try {
            final data = doc.data();
            return {
              'id': doc.id,
              'leadName': 'Lead', // TODO: Obtener nombre del lead
              'scheduledAt': (data['scheduledAt'] is Timestamp)
                  ? (data['scheduledAt'] as Timestamp).toDate().toIso8601String()
                  : DateTime.now().toIso8601String(),
              'type': data['type'] ?? '',
              'status': data['status'] ?? 'scheduled',
            };
          } catch (e) {
            print('Error procesando cita ${doc.id}: $e');
            return {
              'id': doc.id,
              'leadName': 'Lead',
              'scheduledAt': DateTime.now().toIso8601String(),
              'type': '',
              'status': 'scheduled',
            };
          }
        })
        .toList();

      return {
        'stats': {
          'myLeads': myLeads.length,
          'activeLeads': activeLeads,
          'mySales': mySales.length,
          'myRevenue': myRevenue,
          'weeklyRevenue': weeklyRevenue,
          'dailyRevenue': dailyRevenue,
          'monthlyCommissions': 0.0, // TODO: Calcular comisiones desde sales
          'totalCommissions': 0.0,
          'appointmentsToday': appointmentsSnapshot.size,
          'unreadMessages': unreadMessages,
          'conversionRate': conversionRate,
          'totalVehicles': vehiclesSnapshot.size,
          'availableVehicles': vehiclesSnapshot.size,
          'dailySales': dailySales,
          'weeklySales': weeklySales,
          'monthlySales': monthlySales,
        },
        'recentLeads': recentLeadsData,
        'recentSales': recentSalesData,
        'upcomingAppointments': upcomingAppointmentsData,
      };
    } catch (e) {
      print('Error en getSellerStats: $e');
      // Retornar datos por defecto en caso de error
      return {
        'stats': {
          'myLeads': 0,
          'activeLeads': 0,
          'mySales': 0,
          'myRevenue': 0.0,
          'weeklyRevenue': 0.0,
          'dailyRevenue': 0.0,
          'monthlyCommissions': 0.0,
          'totalCommissions': 0.0,
          'appointmentsToday': 0,
          'unreadMessages': 0,
          'conversionRate': 0.0,
          'totalVehicles': 0,
          'availableVehicles': 0,
          'dailySales': 0,
          'weeklySales': 0,
          'monthlySales': 0,
        },
        'recentLeads': <Map<String, dynamic>>[],
        'recentSales': <Map<String, dynamic>>[],
        'upcomingAppointments': <Map<String, dynamic>>[],
      };
    }
  }

  /// Obtiene estadísticas globales para Admin
  Future<Map<String, dynamic>> getAdminGlobalStats() async {
    final permissions = await _auth.getPermissions();
    if (permissions == null || permissions.role != UserRole.admin) {
      throw Exception('No autorizado');
    }

    // Obtener datos globales de todos los tenants
    final usersSnapshot = await FirebaseFirestore.instance
        .collection('users')
        .get();

    final tenantsSnapshot = await FirebaseFirestore.instance
        .collection('tenants')
        .get();

    int totalVehicles = 0;
    int totalLeads = 0;
    int totalSales = 0;
    double totalRevenue = 0.0;
    double monthlyRevenue = 0.0;

    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);

    // Agregar datos de cada tenant
    for (final tenant in tenantsSnapshot.docs) {
      final tenantId = tenant.id;

      final vehiclesSnapshot = await FirebaseFirestore.instance
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .get();

      final leadsSnapshot = await FirebaseFirestore.instance
          .collection('tenants')
          .doc(tenantId)
          .collection('leads')
          .get();

      final salesSnapshot = await FirebaseFirestore.instance
          .collection('tenants')
          .doc(tenantId)
          .collection('sales')
          .get();

      totalVehicles += vehiclesSnapshot.size;
      totalLeads += leadsSnapshot.size;
      totalSales += salesSnapshot.size;

      for (final sale in salesSnapshot.docs) {
        final data = sale.data();
        final salePrice = ((data['salePrice'] ?? data['total'] ?? 0) as num).toDouble();
        totalRevenue += salePrice;

        final createdAt = (data['createdAt'] as Timestamp?)?.toDate();
        if (createdAt != null && createdAt.isAfter(startOfMonth)) {
          monthlyRevenue += salePrice;
        }
      }
    }

    // Obtener suscripciones activas
    final subscriptionsSnapshot = await FirebaseFirestore.instance
        .collection('subscriptions')
        .where('status', isEqualTo: 'active')
        .get();

    return {
      'stats': {
        'totalUsers': usersSnapshot.size,
        'totalTenants': tenantsSnapshot.size,
        'totalVehicles': totalVehicles,
        'totalLeads': totalLeads,
        'totalSales': totalSales,
        'totalRevenue': totalRevenue,
        'activeSubscriptions': subscriptionsSnapshot.size,
        'monthlyRevenue': monthlyRevenue,
      },
    };
  }
}

