// Página de Gestión de Scoring (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/scoring_provider.dart';

class AdminScoringPage extends StatelessWidget {
  const AdminScoringPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reglas de Scoring'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/scoring/create'),
          ),
        ],
      ),
      body: Consumer<ScoringProvider>(
        builder: (context, scoringProvider, _) {
          if (scoringProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final config = scoringProvider.scoringConfig;
          final rulesList = config?['rules'] as List?;
          if (config == null || rulesList == null || rulesList.isEmpty) {
            return const Center(child: Text('No hay reglas de scoring configuradas'));
          }

          final rules = rulesList;
          return ListView.builder(
            itemCount: rules.length,
            itemBuilder: (context, index) {
              final rule = rules[index] as Map<String, dynamic>;
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: const Icon(Icons.score),
                  title: Text(rule['name'] ?? 'Sin nombre'),
                  subtitle: Text('Puntos: ${rule['points'] ?? 0}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/scoring/${rule['id']}/edit'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () => scoringProvider.deleteScoringRule(rule['id'] as String),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


