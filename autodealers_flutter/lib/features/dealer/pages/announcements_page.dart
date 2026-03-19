// Página de Anuncios del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/announcements_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerAnnouncementsPage extends StatelessWidget {
  const DealerAnnouncementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Anuncios'),
      ),
      body: Consumer<AnnouncementsProvider>(
        builder: (context, announcementsProvider, _) {
          if (announcementsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final activeAnnouncements = announcementsProvider.announcements
              .where((a) => a['active'] == true)
              .toList();

          if (activeAnnouncements.isEmpty) {
            return const Center(child: Text('No hay anuncios activos'));
          }

          return ListView.builder(
            itemCount: activeAnnouncements.length,
            itemBuilder: (context, index) {
              final announcement = activeAnnouncements[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: const Icon(Icons.announcement, color: Colors.blue),
                  title: Text(announcement['title'] ?? 'Sin título'),
                  subtitle: Text(announcement['message'] ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => announcementsProvider.dismissAnnouncement(announcement['id'] as String),
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


