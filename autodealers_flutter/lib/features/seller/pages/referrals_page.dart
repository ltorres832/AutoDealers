// Página de Referidos del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/referrals_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerReferralsPage extends StatelessWidget {
  const SellerReferralsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Programa de Referidos'),
      ),
      body: Consumer<ReferralsProvider>(
        builder: (context, referralsProvider, _) {
          if (referralsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (referralsProvider.userReferrals.isEmpty) {
            return const Center(child: Text('No hay referidos'));
          }

          return ListView.builder(
            itemCount: referralsProvider.userReferrals.length,
            itemBuilder: (context, index) {
              final referral = referralsProvider.userReferrals[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  title: Text(referral['referredEmail'] ?? 'Email'),
                  subtitle: Text('Estado: ${referral['status'] ?? 'unknown'}'),
                  trailing: Text('\$${referral['reward'] ?? 0}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


