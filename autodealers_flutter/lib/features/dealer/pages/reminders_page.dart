// Página de Recordatorios del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/reminders_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerRemindersPage extends StatelessWidget {
  const DealerRemindersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Recordatorios'),
      ),
      body: Consumer<RemindersProvider>(
        builder: (context, remindersProvider, _) {
          if (remindersProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (remindersProvider.reminders.isEmpty) {
            return const Center(child: Text('No hay recordatorios'));
          }

          return ListView.builder(
            itemCount: remindersProvider.reminders.length,
            itemBuilder: (context, index) {
              final reminder = remindersProvider.reminders[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: const Icon(Icons.notifications),
                  title: Text(reminder['title'] ?? 'Sin título'),
                  subtitle: Text(reminder['message'] ?? ''),
                  trailing: reminder['sent'] == true
                      ? const Icon(Icons.check, color: Colors.green)
                      : const Icon(Icons.schedule),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


