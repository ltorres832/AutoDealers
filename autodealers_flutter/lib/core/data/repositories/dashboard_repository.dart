// Repositorio de Dashboard - conteos por tenant (Dealer/Seller)
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../config/firebase_config.dart';

class DashboardStats {
  final int totalLeads;
  final int activeLeads;
  final int totalVehicles;
  final int availableVehicles;
  final int totalSales;
  final int appointmentsToday;
  final int unreadMessages;

  const DashboardStats({
    this.totalLeads = 0,
    this.activeLeads = 0,
    this.totalVehicles = 0,
    this.availableVehicles = 0,
    this.totalSales = 0,
    this.appointmentsToday = 0,
    this.unreadMessages = 0,
  });
}

class DashboardRepository {
  final FirebaseFirestore _firestore = FirebaseConfig.firestore;

  Future<DashboardStats> getStats(String tenantId) async {
    if (tenantId.isEmpty) return const DashboardStats();

    try {
      final leadsCount = await _count(
          _firestore.collection('tenants').doc(tenantId).collection('leads'));
      final vehiclesCount = await _count(
          _firestore.collection('tenants').doc(tenantId).collection('vehicles'));
      final salesCount = await _count(
          _firestore.collection('tenants').doc(tenantId).collection('sales'));
      final appointmentsCount = await _countAppointmentsToday(tenantId);
      final messagesCount = await _countUnreadMessages(tenantId);

      final vehiclesAvailable = await _count(
        _firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .where('status', isEqualTo: 'available'),
      );
      final leadsActive = await _count(
        _firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .where('status', isNotEqualTo: 'closed'),
      );

      return DashboardStats(
        totalLeads: leadsCount,
        activeLeads: leadsActive,
        totalVehicles: vehiclesCount,
        availableVehicles: vehiclesAvailable,
        totalSales: salesCount,
        appointmentsToday: appointmentsCount,
        unreadMessages: messagesCount,
      );
    } catch (_) {
      return const DashboardStats();
    }
  }

  Future<int> _count(dynamic query) async {
    try {
      final agg = query.count();
      final snap = await agg.get();
      return snap.count;
    } catch (_) {
      return 0;
    }
  }

  Future<int> _countAppointmentsToday(String tenantId) async {
    try {
      final now = DateTime.now();
      final start = DateTime(now.year, now.month, now.day);
      final end = start.add(const Duration(days: 1));

      final query = _firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('appointments')
          .where('scheduledAt', isGreaterThanOrEqualTo: Timestamp.fromDate(start))
          .where('scheduledAt', isLessThan: Timestamp.fromDate(end));

      final agg = query.count();
      final snap = await agg.get();
      return snap.count ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<int> _countUnreadMessages(String tenantId) async {
    try {
      final query = _firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('messages')
          .where('read', isEqualTo: false);

      final agg = query.count();
      final snap = await agg.get();
      return snap.count ?? 0;
    } catch (_) {
      return 0;
    }
  }
}


