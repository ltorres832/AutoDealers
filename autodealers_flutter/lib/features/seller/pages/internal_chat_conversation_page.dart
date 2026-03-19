// Vista de conversación individual - Chat interno (Seller)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/internal_chat_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerInternalChatConversationPage extends StatefulWidget {
  const SellerInternalChatConversationPage({super.key, required this.otherUserId});
  final String otherUserId;

  @override
  State<SellerInternalChatConversationPage> createState() => _SellerInternalChatConversationPageState();
}

class _SellerInternalChatConversationPageState extends State<SellerInternalChatConversationPage> {
  final _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InternalChatProvider>().loadConversation(widget.otherUserId);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  String _userName() {
    final users = context.read<InternalChatProvider>().users;
    final u = users.cast<Map<String, dynamic>?>().firstWhere(
          (e) => e?['id'] == widget.otherUserId,
          orElse: () => null,
        );
    return u?['name'] ?? 'Usuario';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: Text(_userName()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: Consumer<InternalChatProvider>(
              builder: (context, provider, _) {
                final messages = provider.conversations[widget.otherUserId] ?? [];
                if (messages.isEmpty && !provider.isLoading) {
                  return const Center(child: Text('Sin mensajes'));
                }
                if (provider.isLoading && messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final m = messages[index];
                    final isMe = m['senderId'] != widget.otherUserId;
                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: isMe ? Theme.of(context).colorScheme.primaryContainer : null,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(m['message'] ?? ''),
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
    _messageController.clear();
    context.read<InternalChatProvider>().sendMessage(
          toUserId: widget.otherUserId,
          message: text,
        );
  }
}


