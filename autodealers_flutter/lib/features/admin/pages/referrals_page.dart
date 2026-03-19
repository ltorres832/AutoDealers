// Página de Gestión de Referidos (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/referrals_provider.dart';

class AdminReferralsPage extends StatelessWidget {
  const AdminReferralsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Programa de Referidos'),
      ),
      body: Consumer<ReferralsProvider>(
        builder: (context, referralsProvider, _) {
          if (referralsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tu Código de Referido',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          referralsProvider.referralCode ?? 'Cargando...',
                          style: const TextStyle(fontSize: 24, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Tus Referidos',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                if (referralsProvider.userReferrals.isEmpty)
                  const Center(child: Text('No tienes referidos aún'))
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: referralsProvider.userReferrals.length,
                    itemBuilder: (context, index) {
                      final referral = referralsProvider.userReferrals[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(referral['referredUserName'] ?? 'Sin nombre'),
                          subtitle: Text('Estado: ${referral['status'] ?? 'unknown'}'),
                          trailing: Text('${referral['reward'] ?? 0} puntos'),
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 24),
                const Text(
                  'Tus Recompensas',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                if (referralsProvider.userRewards.isEmpty)
                  const Center(child: Text('No tienes recompensas'))
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: referralsProvider.userRewards.length,
                    itemBuilder: (context, index) {
                      final reward = referralsProvider.userRewards[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(reward['description'] ?? 'Sin descripción'),
                          subtitle: Text('Fecha: ${reward['date'] ?? 'N/A'}'),
                          trailing: Text('${reward['points'] ?? 0} puntos'),
                        ),
                      );
                    },
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}


