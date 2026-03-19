// Modelo de Mensaje - Domain Layer
import 'package:cloud_firestore/cloud_firestore.dart';

enum MessageChannel {
  whatsapp,
  facebook,
  instagram,
  email,
  sms,
}

enum MessageDirection {
  inbound,
  outbound,
}

enum MessageStatus {
  sent,
  delivered,
  read,
  failed,
}

class Message {
  final String id;
  final String tenantId;
  final String? leadId;
  final MessageChannel channel;
  final MessageDirection direction;
  final String from;
  final String to;
  final String content;
  final List<String>? attachments;
  final MessageStatus status;
  final bool aiGenerated;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;

  Message({
    required this.id,
    required this.tenantId,
    this.leadId,
    required this.channel,
    required this.direction,
    required this.from,
    required this.to,
    required this.content,
    this.attachments,
    required this.status,
    required this.aiGenerated,
    required this.metadata,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      leadId: json['leadId'] as String?,
      channel: MessageChannel.values.firstWhere(
        (e) => e.name == json['channel'],
        orElse: () => MessageChannel.whatsapp,
      ),
      direction: MessageDirection.values.firstWhere(
        (e) => e.name == json['direction'],
        orElse: () => MessageDirection.inbound,
      ),
      from: json['from'] as String,
      to: json['to'] as String,
      content: json['content'] as String,
      attachments: json['attachments'] != null
          ? List<String>.from(json['attachments'] as List)
          : null,
      status: MessageStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => MessageStatus.sent,
      ),
      aiGenerated: json['aiGenerated'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
      createdAt: json['createdAt'] is Timestamp
          ? (json['createdAt'] as Timestamp).toDate()
          : DateTime.parse(json['createdAt'].toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'leadId': leadId,
      'channel': channel.name,
      'direction': direction.name,
      'from': from,
      'to': to,
      'content': content,
      'attachments': attachments,
      'status': status.name,
      'aiGenerated': aiGenerated,
      'metadata': metadata,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  // Getters de compatibilidad
  DateTime get timestamp => createdAt;
  bool get read => status == MessageStatus.read;
}


