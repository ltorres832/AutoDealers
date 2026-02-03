import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/messaging_service.dart';
import 'package:intl/intl.dart';

/// Página completa de Mensajería
class MessagesPageComplete extends StatefulWidget {
  const MessagesPageComplete({super.key});

  @override
  State<MessagesPageComplete> createState() => _MessagesPageCompleteState();
}

class _MessagesPageCompleteState extends State<MessagesPageComplete> {
  final MessagingService _messagingService = MessagingService();
  String? _filterChannel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mensajes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: StreamBuilder<List<Message>>(
        stream: _messagingService.watchMessages(channel: _filterChannel),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final messages = snapshot.data ?? [];

          if (messages.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.message_outlined,
                      size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No hay mensajes',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: messages.length,
            itemBuilder: (context, index) {
              final message = messages[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: Icon(
                    _getChannelIcon(message.channel),
                    color: _getChannelColor(message.channel),
                  ),
                  title: Text(
                    message.content,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    '${_getChannelName(message.channel)} • ${DateFormat('dd/MM/yyyy HH:mm').format(message.createdAt)}',
                  ),
                  trailing: Chip(
                    label: Text(
                      message.direction == 'inbound' ? 'Recibido' : 'Enviado',
                      style: const TextStyle(fontSize: 10, color: Colors.white),
                    ),
                    backgroundColor: message.direction == 'inbound'
                        ? Colors.blue
                        : Colors.green,
                  ),
                  onTap: () {
                    // TODO: Navegar a conversación
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Mostrar modal de enviar mensaje
        },
        child: const Icon(Icons.send),
      ),
    );
  }

  IconData _getChannelIcon(String channel) {
    switch (channel) {
      case 'whatsapp':
        return Icons.chat;
      case 'email':
        return Icons.email;
      case 'sms':
        return Icons.sms;
      default:
        return Icons.message;
    }
  }

  Color _getChannelColor(String channel) {
    switch (channel) {
      case 'whatsapp':
        return Colors.green;
      case 'email':
        return Colors.blue;
      case 'sms':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getChannelName(String channel) {
    switch (channel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'email':
        return 'Email';
      case 'sms':
        return 'SMS';
      default:
        return channel;
    }
  }

  void _showFilterDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filtrar Mensajes'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Todos'),
              leading: Radio<String?>(
                value: null,
                groupValue: _filterChannel,
                onChanged: (value) {
                  setState(() => _filterChannel = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('WhatsApp'),
              leading: Radio<String?>(
                value: 'whatsapp',
                groupValue: _filterChannel,
                onChanged: (value) {
                  setState(() => _filterChannel = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('Email'),
              leading: Radio<String?>(
                value: 'email',
                groupValue: _filterChannel,
                onChanged: (value) {
                  setState(() => _filterChannel = value);
                  Navigator.pop(context);
                },
              ),
            ),
            ListTile(
              title: const Text('SMS'),
              leading: Radio<String?>(
                value: 'sms',
                groupValue: _filterChannel,
                onChanged: (value) {
                  setState(() => _filterChannel = value);
                  Navigator.pop(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}


