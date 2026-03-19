// Página Principal Pública - Replica de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/inventory_provider.dart';
import '../../../core/domain/models/vehicle.dart';
import '../widgets/public_navbar.dart';
import '../widgets/hero_banner_widget.dart';
import '../widgets/hero_section.dart';
import '../widgets/vehicle_categories_section.dart';
import '../widgets/featured_vehicles_section.dart';
import '../widgets/vehicles_catalog_section.dart';
import '../widgets/finance_calculator_section.dart';
import '../widgets/promotions_section.dart';
import '../widgets/featured_dealers_section.dart';
import '../widgets/reviews_section.dart';
import '../widgets/trust_section.dart';
import '../widgets/contact_section.dart';
import '../widgets/public_footer.dart';

class PublicHomePage extends StatefulWidget {
  const PublicHomePage({super.key});

  @override
  State<PublicHomePage> createState() => _PublicHomePageState();
}

class _PublicHomePageState extends State<PublicHomePage> {
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _promotionsKey = GlobalKey();
  final GlobalKey _contactKey = GlobalKey();
  bool _scrolled = false;
  String? _lastScrolledSection;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_handleScroll);
    // Cargar vehículos públicos (sin tenantId específico)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final inventoryProvider = context.read<InventoryProvider>();
      inventoryProvider.loadVehicles(status: VehicleStatus.available);
      _scrollToSectionFromRoute();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Si llegamos con ?section=... hacer scroll tras el primer frame
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToSectionFromRoute());
  }

  void _scrollToSectionFromRoute() {
    final section = GoRouterState.of(context).uri.queryParameters['section'];
    if (section == null) {
      _lastScrolledSection = null;
      return;
    }
    if (section == _lastScrolledSection) return;
    final key = section == 'promotions' ? _promotionsKey : (section == 'contact' ? _contactKey : null);
    if (key?.currentContext != null) {
      _lastScrolledSection = section;
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
        alignment: 0.1,
      );
    }
  }

  void _scrollToPromotions() {
    if (_promotionsKey.currentContext != null) {
      Scrollable.ensureVisible(
        _promotionsKey.currentContext!,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
        alignment: 0.1,
      );
    }
  }

  void _scrollToContact() {
    if (_contactKey.currentContext != null) {
      Scrollable.ensureVisible(
        _contactKey.currentContext!,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
        alignment: 0.1,
      );
    }
  }

  void _handleScroll() {
    if (_scrollController.hasClients) {
      final newScrolled = _scrollController.offset > 50;
      if (newScrolled != _scrolled) {
        setState(() {
          _scrolled = newScrolled;
        });
      }
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_handleScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: SafeArea(
        child: Scaffold(
          backgroundColor: Colors.white,
          body: SelectionArea(
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                PublicNavbar(
                  scrolled: _scrolled,
                  scrollToPromotions: _scrollToPromotions,
                  scrollToContact: _scrollToContact,
                ),
                const SliverToBoxAdapter(child: HeroBannerWidget()),
                const SliverToBoxAdapter(child: HeroSection()),
                const SliverToBoxAdapter(child: VehicleCategoriesSection()),
                const SliverToBoxAdapter(child: FeaturedVehiclesSection()),
                const SliverToBoxAdapter(child: VehiclesCatalogSection()),
                SliverToBoxAdapter(key: _promotionsKey, child: const PromotionsSection()),
                const SliverToBoxAdapter(child: FeaturedDealersSection()),
                const SliverToBoxAdapter(child: FinanceCalculatorSection()),
                const SliverToBoxAdapter(child: ReviewsSection()),
                const SliverToBoxAdapter(child: TrustSection()),
                SliverToBoxAdapter(key: _contactKey, child: const ContactSection()),
                const SliverToBoxAdapter(child: PublicFooter()),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


