// Página de Publicaciones Sociales del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/social_media_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerSocialPostsPage extends StatelessWidget {
  const DealerSocialPostsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Publicaciones Sociales'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/social-posts/create'),
          ),
        ],
      ),
      body: Consumer<SocialMediaProvider>(
        builder: (context, socialMediaProvider, _) {
          if (socialMediaProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (socialMediaProvider.posts.isEmpty) {
            return const Center(child: Text('No hay publicaciones'));
          }

          return ListView.builder(
            itemCount: socialMediaProvider.posts.length,
            itemBuilder: (context, index) {
              final post = socialMediaProvider.posts[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: Icon(_getPlatformIcon(post['platform'])),
                  title: Text(post['content'] ?? 'Sin contenido'),
                  subtitle: Text('Estado: ${post['status'] ?? 'unknown'}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/dealer/social-posts/${post['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }

  IconData _getPlatformIcon(String? platform) {
    switch (platform) {
      case 'facebook':
        return Icons.facebook;
      case 'instagram':
        return Icons.camera_alt;
      default:
        return Icons.share;
    }
  }
}


