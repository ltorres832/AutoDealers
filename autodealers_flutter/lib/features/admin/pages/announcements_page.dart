// Página de Gestión de Anuncios (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/announcements_provider.dart';

class AdminAnnouncementsPage extends StatelessWidget {
  const AdminAnnouncementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Anuncios'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/announcements/create'),
          ),
        ],
      ),
      body: Consumer<AnnouncementsProvider>(
        builder: (context, announcementsProvider, _) {
          if (announcementsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (announcementsProvider.announcements.isEmpty) {
            return const Center(child: Text('No hay anuncios'));
          }

          return ListView.builder(
            itemCount: announcementsProvider.announcements.length,
            itemBuilder: (context, index) {
              final announcement = announcementsProvider.announcements[index];
              final isActive = announcement['active'] == true;
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: Icon(
                    isActive ? Icons.announcement : Icons.announcement_outlined,
                    color: isActive ? Colors.blue : Colors.grey,
                  ),
                  title: Text(announcement['title'] ?? 'Sin título'),
                  subtitle: Text(announcement['message'] ?? ''),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/announcements/${announcement['id']}/edit'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () => announcementsProvider.deleteAnnouncement(announcement['id'] as String),
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


