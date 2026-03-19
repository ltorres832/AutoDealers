// Página de Chat Interno del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/internal_chat_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerInternalChatPage extends StatelessWidget {
  const SellerInternalChatPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
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
              final lastMessage = conversationList.isNotEmpty ? conversationList.last : null;

              return ListTile(
                leading: CircleAvatar(
                  child: Text(user['name']?[0] ?? 'U'),
                ),
                title: Text(user['name'] ?? 'Usuario'),
                subtitle: lastMessage != null
                    ? Text(lastMessage['message'] ?? '')
                    : const Text('Sin mensajes'),
                trailing: lastMessage != null
                    ? Text(
                        _formatTime(lastMessage['timestamp']),
                        style: const TextStyle(fontSize: 12),
                      )
                    : null,
                onTap: () {
                  final userId = user['id'] as String? ?? '';
                  if (userId.isNotEmpty) context.push('/seller/internal-chat/$userId');
                },
              );
            },
          );
        },
      ),
    );
  }

  String _formatTime(dynamic timestamp) {
    if (timestamp == null) return '';
    try {
      final date = timestamp.toDate();
      return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '';
    }
  }
}


