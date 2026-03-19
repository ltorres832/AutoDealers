// Página de Mensajes del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/messaging_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/domain/models/message.dart';
import '../widgets/dealer_drawer.dart';

class DealerMessagesPage extends StatefulWidget {
  const DealerMessagesPage({super.key});

  @override
  State<DealerMessagesPage> createState() => _DealerMessagesPageState();
}

class _DealerMessagesPageState extends State<DealerMessagesPage> {
  String _channelFilter = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final messagingProvider = context.read<MessagingProvider>();
      if (authProvider.user?.tenantId != null) {
        messagingProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Mensajes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final authProvider = context.read<AuthProvider>();
              final messagingProvider = context.read<MessagingProvider>();
              if (authProvider.user?.tenantId != null) {
                messagingProvider.initialize(authProvider.user!.tenantId);
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Buscar',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _channelFilter.isEmpty ? null : _channelFilter,
                  hint: const Text('Canal'),
                  items: const [
                    DropdownMenuItem(value: 'whatsapp', child: Text('WhatsApp')),
                    DropdownMenuItem(value: 'email', child: Text('Email')),
                    DropdownMenuItem(value: 'sms', child: Text('SMS')),
                    DropdownMenuItem(value: 'facebook', child: Text('Facebook')),
                    DropdownMenuItem(value: 'instagram', child: Text('Instagram')),
                  ],
                  onChanged: (value) => setState(() => _channelFilter = value ?? ''),
                ),
              ],
            ),
          ),
          // Lista de conversaciones
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

                // Agrupar mensajes por leadId
                final Map<String, List<Message>> conversations = {};
                for (var message in messagingProvider.messages) {
                  final leadId = message.leadId ?? 'unknown';
                  if (!conversations.containsKey(leadId)) {
                    conversations[leadId] = [];
                  }
                  conversations[leadId]!.add(message);
                }

                var filteredConversations = conversations.entries.toList();
                if (_channelFilter.isNotEmpty) {
                  filteredConversations = filteredConversations.where((entry) {
                    return entry.value.any((msg) => msg.channel.name == _channelFilter);
                  }).toList();
                }

                if (_searchController.text.isNotEmpty) {
                  final searchLower = _searchController.text.toLowerCase();
                  filteredConversations = filteredConversations.where((entry) {
                    return entry.value.any((msg) =>
                        msg.content.toLowerCase().contains(searchLower) ||
                        msg.from.toLowerCase().contains(searchLower));
                  }).toList();
                }

                if (filteredConversations.isEmpty) {
                  return const Center(
                    child: Text('No hay mensajes disponibles'),
                  );
                }

                return ListView.builder(
                  itemCount: filteredConversations.length,
                  itemBuilder: (context, index) {
                    final entry = filteredConversations[index];
                    final messages = entry.value;
                    final lastMessage = messages.last;
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Icon(_getChannelIcon(lastMessage.channel)),
                        ),
                        title: Text(lastMessage.from),
                        subtitle: Text(
                          lastMessage.content.length > 50
                              ? '${lastMessage.content.substring(0, 50)}...'
                              : lastMessage.content,
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _formatTime(lastMessage.timestamp),
                              style: const TextStyle(fontSize: 12),
                            ),
                            if (messages.any((m) => !m.read))
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.blue,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                        onTap: () {
                          context.push('/messages?leadId=${entry.key}');
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  IconData _getChannelIcon(MessageChannel channel) {
    switch (channel) {
      case MessageChannel.whatsapp:
        return Icons.chat;
      case MessageChannel.email:
        return Icons.email;
      case MessageChannel.sms:
        return Icons.sms;
      case MessageChannel.facebook:
        return Icons.facebook;
      case MessageChannel.instagram:
        return Icons.camera_alt;
      default:
        return Icons.message;
    }
  }

  String _formatTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inDays > 7) {
      return '${timestamp.day}/${timestamp.month}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m';
    } else {
      return 'Ahora';
    }
  }
}


