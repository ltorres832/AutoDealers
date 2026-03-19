// Vista de conversación - Chat público (Seller)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/public_chat_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerPublicChatConversationPage extends StatefulWidget {
  const SellerPublicChatConversationPage({super.key, required this.sessionId});
  final String sessionId;

  @override
  State<SellerPublicChatConversationPage> createState() => _SellerPublicChatConversationPageState();
}

class _SellerPublicChatConversationPageState extends State<SellerPublicChatConversationPage> {
  final _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<PublicChatProvider>();
      final list = provider.conversations.cast<Map<String, dynamic>>().where((c) => c['sessionId'] == widget.sessionId).toList();
      if (list.isNotEmpty) provider.selectConversation(list.first);
      provider.loadMessages(widget.sessionId);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: Consumer<PublicChatProvider>(
          builder: (context, provider, _) {
            final list = provider.conversations.cast<Map<String, dynamic>>().where((c) => c['sessionId'] == widget.sessionId).toList();
            final name = provider.selectedConversation?['customerName'] ?? (list.isNotEmpty ? (list.first['customerName'] ?? 'Cliente') : null);
            return Text(name ?? 'Conversación');
          },
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: Consumer<PublicChatProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading && provider.messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                final messages = provider.messages;
                if (messages.isEmpty) {
                  return const Center(child: Text('Sin mensajes'));
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final m = messages[index];
                    final isFromClient = m['sender'] == 'client';
                    return Align(
                      alignment: isFromClient ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isFromClient ? null : Theme.of(context).colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(m['content'] ?? m['message'] ?? ''),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      hintText: 'Mensaje',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _send,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _send() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    final provider = context.read<PublicChatProvider>();
    final list = provider.conversations.cast<Map<String, dynamic>>().where((c) => c['sessionId'] == widget.sessionId).toList();
    final conv = provider.selectedConversation ?? (list.isNotEmpty ? list.first : null);
    _messageController.clear();
    if (conv != null) {
      provider.sendMessage(
        sessionId: widget.sessionId,
        clientName: conv['customerName'] ?? 'Cliente',
        content: text,
        clientEmail: conv['customerEmail'],
        clientPhone: conv['customerPhone'],
      );
    }
  }
}


