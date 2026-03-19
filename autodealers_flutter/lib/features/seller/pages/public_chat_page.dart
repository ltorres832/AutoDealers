// Página de Chat Público del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/public_chat_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerPublicChatPage extends StatelessWidget {
  const SellerPublicChatPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Chat Público'),
      ),
      body: Consumer<PublicChatProvider>(
        builder: (context, publicChatProvider, _) {
          if (publicChatProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (publicChatProvider.conversations.isEmpty) {
            return const Center(child: Text('No hay conversaciones públicas'));
          }

          return ListView.builder(
            itemCount: publicChatProvider.conversations.length,
            itemBuilder: (context, index) {
              final conversation = publicChatProvider.conversations[index];
              return ListTile(
                title: Text(conversation['customerName'] ?? 'Cliente'),
                subtitle: Text(conversation['lastMessage'] ?? ''),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  final sessionId = conversation['sessionId'] as String? ?? '';
                  if (sessionId.isNotEmpty) context.push('/seller/public-chat/$sessionId');
                },
              );
            },
          );
        },
      ),
    );
  }
}


