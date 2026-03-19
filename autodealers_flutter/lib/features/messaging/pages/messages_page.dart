// Página de Mensajes
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/messaging_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/message.dart';

class MessagesPage extends StatefulWidget {
  final String? leadId;

  const MessagesPage({super.key, this.leadId});

  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  final _messageController = TextEditingController();
  MessageChannel _selectedChannel = MessageChannel.whatsapp;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final messagingProvider = context.read<MessagingProvider>();
      if (authProvider.user?.tenantId != null) {
        messagingProvider.initialize(authProvider.user!.tenantId);
        if (widget.leadId != null) {
          messagingProvider.loadMessages(leadId: widget.leadId);
        }
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    if (_messageController.text.trim().isEmpty) return;

    final authProvider = context.read<AuthProvider>();
    final messagingProvider = context.read<MessagingProvider>();

    if (authProvider.user?.tenantId == null) return;

    final message = Message(
      id: '',
      tenantId: authProvider.user!.tenantId!,
      leadId: widget.leadId,
      channel: _selectedChannel,
      direction: MessageDirection.outbound,
      from: authProvider.user!.id,
      to: '', // Se obtendrá del lead si existe
      content: _messageController.text.trim(),
      status: MessageStatus.sent,
      aiGenerated: false,
      metadata: {},
      createdAt: DateTime.now(),
    );

    final success = await messagingProvider.sendMessage(message);

    if (mounted && success) {
      _messageController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mensajes'),
        actions: [
          DropdownButton<MessageChannel>(
            value: _selectedChannel,
            items: MessageChannel.values.map((channel) {
              return DropdownMenuItem(
                value: channel,
                child: Text(channel.name),
              );
            }).toList(),
            onChanged: (value) {
              if (value != null) {
                setState(() {
                  _selectedChannel = value;
                });
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Consumer<MessagingProvider>(
              builder: (context, messagingProvider, _) {
                if (messagingProvider.isLoading && messagingProvider.messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (messagingProvider.error != null) {
                  return Center(
                    child: Text('Error: ${messagingProvider.error}'),
                  );
                }

                if (messagingProvider.messages.isEmpty) {
                  return const Center(
                    child: Text('No hay mensajes'),
                  );
                }

                return ListView.builder(
                  reverse: true,
                  padding: const EdgeInsets.all(16),
                  itemCount: messagingProvider.messages.length,
                  itemBuilder: (context, index) {
                    final message = messagingProvider.messages[index];
                    final isOutbound = message.direction == MessageDirection.outbound;

                    return Align(
                      alignment: isOutbound ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isOutbound ? Colors.blue : Colors.grey[300],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.7,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              message.content,
                              style: TextStyle(
                                color: isOutbound ? Colors.white : Colors.black,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${message.createdAt.hour}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                              style: TextStyle(
                                fontSize: 12,
                                color: isOutbound
                                    ? Colors.white70
                                    : Colors.black54,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.2),
                  spreadRadius: 1,
                  blurRadius: 5,
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      hintText: 'Escribe un mensaje...',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    maxLines: null,
                  ),
                ),
                const SizedBox(width: 8),
                Consumer<MessagingProvider>(
                  builder: (context, messagingProvider, _) {
                    return IconButton(
                      icon: messagingProvider.isLoading
                          ? const CircularProgressIndicator()
                          : const Icon(Icons.send),
                      onPressed: messagingProvider.isLoading ? null : _handleSend,
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


