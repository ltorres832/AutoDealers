// Página de Publicaciones Sociales del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/social_media_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerSocialPostsPage extends StatelessWidget {
  const SellerSocialPostsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Publicaciones Sociales'),
      ),
      body: Consumer<SocialMediaProvider>(
        builder: (context, socialProvider, _) {
          if (socialProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (socialProvider.posts.isEmpty) {
            return const Center(child: Text('No hay publicaciones'));
          }

          return ListView.builder(
            itemCount: socialProvider.posts.length,
            itemBuilder: (context, index) {
              final post = socialProvider.posts[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  title: Text(post['content'] ?? ''),
                  subtitle: Text('Plataforma: ${post['platform'] ?? 'N/A'}'),
                  trailing: Icon(
                    post['status'] == 'published' ? Icons.check_circle : Icons.schedule,
                    color: post['status'] == 'published' ? Colors.green : Colors.orange,
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


