// Página de Gestión de Feature Flags (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/feature_flags_provider.dart';

class AdminFeatureFlagsPage extends StatelessWidget {
  const AdminFeatureFlagsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feature Flags'),
      ),
      body: Consumer<FeatureFlagsProvider>(
        builder: (context, featureFlagsProvider, _) {
          if (featureFlagsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final flags = featureFlagsProvider.featureFlags;
          if (flags.isEmpty) {
            return const Center(child: Text('No hay feature flags configurados'));
          }

          final flagsList = flags.entries.toList();
          return ListView.builder(
            itemCount: flagsList.length,
            itemBuilder: (context, index) {
              final entry = flagsList[index];
              final flagKey = entry.key;
              final flagValue = entry.value;
              return Card(
                margin: const EdgeInsets.all(8),
                child: SwitchListTile(
                  title: Text(flagKey),
                  subtitle: const Text(''),
                  value: flagValue,
                  onChanged: (value) {
                    featureFlagsProvider.updateFeatureFlag(
                      flagKey,
                      enabled: value,
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}


