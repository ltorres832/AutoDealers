// Página de Chat Público (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/public_chat_provider.dart';

class AdminPublicChatPage extends StatelessWidget {
  const AdminPublicChatPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat Público'),
      ),
      body: Consumer<PublicChatProvider>(
        builder: (context, publicChatProvider, _) {
          if (publicChatProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (publicChatProvider.conversations.isEmpty) {
            return const Center(child: Text('No hay conversaciones'));
          }

          return ListView.builder(
            itemCount: publicChatProvider.conversations.length,
            itemBuilder: (context, index) {
              final conversation = publicChatProvider.conversations[index];
              final hasUnread = conversation['unreadCount'] != null && (conversation['unreadCount'] as int) > 0;
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text((conversation['customerName'] ?? 'U')[0].toUpperCase()),
                  ),
                  title: Text(conversation['customerName'] ?? 'Sin nombre'),
                  subtitle: Text(conversation['lastMessage'] ?? ''),
                  trailing: hasUnread
                      ? Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${conversation['unreadCount']}',
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                          ),
                        )
                      : null,
                  onTap: () => context.push('/admin/public-chat/${conversation['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


