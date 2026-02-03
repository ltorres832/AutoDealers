import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/models/user_role.dart';
import '../services/dashboard_service.dart';
import 'package:intl/intl.dart';

/// Dashboard completo con soporte para Admin, Dealer y Seller
class DashboardPageComplete extends StatefulWidget {
  const DashboardPageComplete({super.key});

  @override
  State<DashboardPageComplete> createState() => _DashboardPageCompleteState();
}

class _DashboardPageCompleteState extends State<DashboardPageComplete> {
  final DashboardService _dashboardService = DashboardService();
  final AuthService _authService = AuthService();
  
  Map<String, dynamic>? _stats;
  List<Map<String, dynamic>>? _recentLeads;
  List<Map<String, dynamic>>? _recentSales;
  List<Map<String, dynamic>>? _topSellers;
  List<Map<String, dynamic>>? _upcomingAppointments;
  bool _loading = true;
  UserRole? _userRole;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _loading = true);

    try {
      final permissions = await _authService.getPermissions();
      if (permissions == null) {
        if (mounted) context.go('/login');
        return;
      }

      _userRole = permissions.role;

      Map<String, dynamic> data;
      if (permissions.role == UserRole.admin) {
        data = await _dashboardService.getAdminGlobalStats();
      } else if (permissions.role == UserRole.dealer) {
        data = await _dashboardService.getDealerStats();
      } else {
        data = await _dashboardService.getSellerStats();
      }

      setState(() {
        _stats = data['stats'] as Map<String, dynamic>?;
        _recentLeads = data['recentLeads'] as List<Map<String, dynamic>>?;
        _recentSales = data['recentSales'] as List<Map<String, dynamic>>?;
        _topSellers = data['topSellers'] as List<Map<String, dynamic>>?;
        _upcomingAppointments = data['upcomingAppointments'] as List<Map<String, dynamic>>?;
        _loading = false;
      });
    } catch (e, stackTrace) {
      print('Error loading dashboard: $e');
      print('Stack trace: $stackTrace');
      if (mounted) {
        setState(() {
          _loading = false;
          // Inicializar con datos vacíos en caso de error
          _stats = {};
          _recentLeads = [];
          _recentSales = [];
          _upcomingAppointments = [];
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_stats == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dashboard')),
        body: const Center(child: Text('Error al cargar datos')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_getDashboardTitle()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboard,
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Estadísticas principales
              _buildStatsGrid(),
              const SizedBox(height: 24),
              
              // Top Vendedores (solo para Dealer)
              if (_userRole == UserRole.dealer && _topSellers != null && _topSellers!.isNotEmpty)
                _buildTopSellers(),
              
              // Leads recientes
              if (_recentLeads != null && _recentLeads!.isNotEmpty)
                _buildRecentLeads(),
              
              // Ventas recientes
              if (_recentSales != null && _recentSales!.isNotEmpty)
                _buildRecentSales(),
              
              // Citas próximas (solo para Seller)
              if (_userRole == UserRole.seller && _upcomingAppointments != null && _upcomingAppointments!.isNotEmpty)
                _buildUpcomingAppointments(),
              
              // Acciones rápidas
              _buildQuickActions(),
            ],
          ),
        ),
      ),
    );
  }

  String _getDashboardTitle() {
    switch (_userRole) {
      case UserRole.admin:
        return 'Vista Global';
      case UserRole.dealer:
        return 'Dashboard Dealer';
      case UserRole.seller:
        return 'Dashboard Vendedor';
      default:
        return 'Dashboard';
    }
  }

  Widget _buildStatsGrid() {
    if (_userRole == UserRole.admin) {
      return _buildAdminStats();
    } else if (_userRole == UserRole.dealer) {
      return _buildDealerStats();
    } else {
      return _buildSellerStats();
    }
  }

  Widget _buildAdminStats() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          title: 'Total Usuarios',
          value: '${_stats!['totalUsers'] ?? 0}',
          icon: Icons.people,
          color: Colors.blue,
        ),
        _StatCard(
          title: 'Total Tenants',
          value: '${_stats!['totalTenants'] ?? 0}',
          icon: Icons.business,
          color: Colors.green,
        ),
        _StatCard(
          title: 'Total Vehículos',
          value: '${_stats!['totalVehicles'] ?? 0}',
          icon: Icons.directions_car,
          color: Colors.orange,
        ),
        _StatCard(
          title: 'Total Leads',
          value: '${_stats!['totalLeads'] ?? 0}',
          icon: Icons.phone,
          color: Colors.purple,
        ),
        _StatCard(
          title: 'Total Ventas',
          value: '${_stats!['totalSales'] ?? 0}',
          icon: Icons.shopping_cart,
          color: Colors.red,
        ),
        _StatCard(
          title: 'Revenue Total',
          value: '\$${_formatNumber(_stats!['totalRevenue'] ?? 0)}',
          icon: Icons.attach_money,
          color: Colors.teal,
        ),
        _StatCard(
          title: 'Suscripciones',
          value: '${_stats!['activeSubscriptions'] ?? 0}',
          icon: Icons.card_membership,
          color: Colors.indigo,
        ),
        _StatCard(
          title: 'Revenue Mensual',
          value: '\$${_formatNumber(_stats!['monthlyRevenue'] ?? 0)}',
          icon: Icons.trending_up,
          color: Colors.pink,
        ),
      ],
    );
  }

  Widget _buildDealerStats() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          title: 'Total Leads',
          value: '${_stats!['totalLeads'] ?? 0}',
          subtitle: '${_stats!['activeLeads'] ?? 0} activos',
          icon: Icons.phone,
          color: Colors.blue,
          onTap: () => context.push('/leads'),
        ),
        _StatCard(
          title: 'Vehículos',
          value: '${_stats!['availableVehicles'] ?? 0}',
          subtitle: 'de ${_stats!['totalVehicles'] ?? 0}',
          icon: Icons.directions_car,
          color: Colors.green,
          onTap: () => context.push('/inventory'),
        ),
        _StatCard(
          title: 'Ventas',
          value: '${_stats!['totalSales'] ?? 0}',
          subtitle: 'este mes',
          icon: Icons.shopping_cart,
          color: Colors.orange,
          onTap: () => context.push('/sales-statistics'),
        ),
        _StatCard(
          title: 'Revenue',
          value: '\$${_formatNumber(_stats!['monthlyRevenue'] ?? 0)}',
          subtitle: 'este mes',
          icon: Icons.attach_money,
          color: Colors.purple,
        ),
        _StatCard(
          title: 'Citas Hoy',
          value: '${_stats!['appointmentsToday'] ?? 0}',
          icon: Icons.calendar_today,
          color: Colors.red,
          onTap: () => context.push('/appointments'),
        ),
        _StatCard(
          title: 'Mensajes',
          value: '${_stats!['unreadMessages'] ?? 0}',
          subtitle: 'no leídos',
          icon: Icons.message,
          color: Colors.teal,
          onTap: () => context.push('/messages'),
        ),
        _StatCard(
          title: 'Vendedores',
          value: '${_stats!['totalSellers'] ?? 0}',
          subtitle: '${_stats!['sellersSales'] ?? 0} ventas',
          icon: Icons.people,
          color: Colors.indigo,
          onTap: () => context.push('/sellers'),
        ),
      ],
    );
  }

  Widget _buildSellerStats() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          title: 'Mis Leads',
          value: '${_stats!['myLeads'] ?? 0}',
          subtitle: '${_stats!['activeLeads'] ?? 0} activos',
          icon: Icons.phone,
          color: Colors.blue,
          onTap: () => context.push('/leads'),
        ),
        _StatCard(
          title: 'Mis Ventas',
          value: '${_stats!['mySales'] ?? 0}',
          subtitle: '${_stats!['monthlySales'] ?? 0} este mes',
          icon: Icons.shopping_cart,
          color: Colors.green,
          onTap: () => context.push('/sales-statistics'),
        ),
        _StatCard(
          title: 'Revenue',
          value: '\$${_formatNumber(_stats!['myRevenue'] ?? 0)}',
          subtitle: '\$${_formatNumber(_stats!['weeklyRevenue'] ?? 0)} esta semana',
          icon: Icons.attach_money,
          color: Colors.orange,
        ),
        _StatCard(
          title: 'Tasa Conversión',
          value: '${(_stats!['conversionRate'] ?? 0).toStringAsFixed(1)}%',
          icon: Icons.trending_up,
          color: Colors.purple,
        ),
        _StatCard(
          title: 'Citas Hoy',
          value: '${_stats!['appointmentsToday'] ?? 0}',
          icon: Icons.calendar_today,
          color: Colors.red,
          onTap: () => context.push('/appointments'),
        ),
        _StatCard(
          title: 'Mensajes',
          value: '${_stats!['unreadMessages'] ?? 0}',
          subtitle: 'no leídos',
          icon: Icons.message,
          color: Colors.teal,
          onTap: () => context.push('/messages'),
        ),
        _StatCard(
          title: 'Vehículos',
          value: '${_stats!['availableVehicles'] ?? 0}',
          subtitle: 'disponibles',
          icon: Icons.directions_car,
          color: Colors.indigo,
          onTap: () => context.push('/inventory'),
        ),
        _StatCard(
          title: 'Ventas Hoy',
          value: '${_stats!['dailySales'] ?? 0}',
          subtitle: '\$${_formatNumber(_stats!['dailyRevenue'] ?? 0)}',
          icon: Icons.today,
          color: Colors.pink,
        ),
      ],
    );
  }

  Widget _buildTopSellers() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Top Vendedores',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            ..._topSellers!.map((seller) => ListTile(
                  leading: CircleAvatar(
                    child: Text(seller['name'].toString().substring(0, 1).toUpperCase()),
                  ),
                  title: Text(seller['name'] ?? ''),
                  subtitle: Text('${seller['sales']} ventas'),
                  trailing: Text(
                    '\$${_formatNumber(seller['revenue'] ?? 0)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentLeads() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Leads Recientes',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton(
                  onPressed: () => context.push('/leads'),
                  child: const Text('Ver todos'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._recentLeads!.take(5).map((lead) => ListTile(
                  leading: const Icon(Icons.person),
                  title: Text(lead['name'] ?? ''),
                  subtitle: Text(lead['source'] ?? ''),
                  trailing: Chip(
                    label: Text(lead['status'] ?? ''),
                    backgroundColor: _getStatusColor(lead['status']),
                  ),
                  onTap: () => context.push('/leads/${lead['id']}'),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSales() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Ventas Recientes',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton(
                  onPressed: () => context.push('/sales-statistics'),
                  child: const Text('Ver todas'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._recentSales!.take(5).map((sale) => ListTile(
                  leading: const Icon(Icons.shopping_cart),
                  title: Text(sale['vehicle'] ?? ''),
                  subtitle: Text('${sale['customerName'] ?? ''} - ${sale['sellerName'] ?? ''}'),
                  trailing: Text(
                    '\$${_formatNumber(sale['price'] ?? 0)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildUpcomingAppointments() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Citas Próximas',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton(
                  onPressed: () => context.push('/appointments'),
                  child: const Text('Ver todas'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._upcomingAppointments!.map((apt) {
              final scheduledAt = DateTime.tryParse(apt['scheduledAt'] ?? '') ?? DateTime.now();
              return ListTile(
                leading: const Icon(Icons.calendar_today, color: Colors.blue),
                title: Text(apt['leadName'] ?? 'Lead'),
                subtitle: Text(
                  DateFormat('EEEE, dd MMMM yyyy - HH:mm').format(scheduledAt),
                ),
                trailing: Chip(
                  label: Text(apt['status'] ?? ''),
                  backgroundColor: _getAppointmentStatusColor(apt['status']),
                ),
                onTap: () => context.push('/appointments'),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Acciones Rápidas',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _QuickActionChip(
                  icon: Icons.add,
                  label: 'Nuevo Lead',
                  onTap: () {
                    context.push('/leads');
                  },
                ),
                _QuickActionChip(
                  icon: Icons.calendar_today,
                  label: 'Nueva Cita',
                  onTap: () => context.push('/appointments'),
                ),
                _QuickActionChip(
                  icon: Icons.message,
                  label: 'Enviar Mensaje',
                  onTap: () => context.push('/messages'),
                ),
                if (_userRole == UserRole.dealer)
                  _QuickActionChip(
                    icon: Icons.directions_car,
                    label: 'Agregar Vehículo',
                    onTap: () => context.push('/inventory'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'new':
        return Colors.blue;
      case 'contacted':
        return Colors.orange;
      case 'qualified':
        return Colors.green;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  Color _getAppointmentStatusColor(String? status) {
    switch (status) {
      case 'scheduled':
        return Colors.blue;
      case 'confirmed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'completed':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _formatNumber(dynamic number) {
    if (number is num) {
      return NumberFormat('#,###').format(number);
    }
    return number.toString();
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _StatCard({
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 8),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                title,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[500],
                        fontSize: 11,
                      ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap,
    );
  }
}
