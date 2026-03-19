// Página de Chat Interno del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/internal_chat_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerInternalChatPage extends StatelessWidget {
  const DealerInternalChatPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Chat Interno'),
      ),
      body: Consumer<InternalChatProvider>(
        builder: (context, internalChatProvider, _) {
          if (internalChatProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (internalChatProvider.users.isEmpty) {
            return const Center(child: Text('No hay usuarios disponibles'));
          }

          return ListView.builder(
            itemCount: internalChatProvider.users.length,
            itemBuilder: (context, index) {
              final user = internalChatProvider.users[index];
              final conversationList = internalChatProvider.conversations[user['id']] ?? [];
              final conversation = conversationList.isNotEmpty 
                  ? conversationList.first 
                  : <String, dynamic>{};
              final hasUnread = conversation['unreadCount'] != null && (conversation['unreadCount'] as int) > 0;

              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text((user['name'] ?? 'U')[0].toUpperCase()),
                  ),
                  title: Text(user['name'] ?? 'Sin nombre'),
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
                  onTap: () => context.push('/dealer/internal-chat/${user['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


