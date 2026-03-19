// Modelo de Lead - Domain Layer
import 'package:cloud_firestore/cloud_firestore.dart';

DateTime _parseTimestamp(dynamic value) {
  if (value == null) return DateTime.now();
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  if (value is String) {
    try {
      return DateTime.parse(value);
    } catch (e) {
      return DateTime.now();
    }
  }
  return DateTime.now();
}

enum LeadSource {
  whatsapp,
  facebook,
  instagram,
  web,
  email,
  sms,
  phone,
}

enum LeadStatus {
  new_,
  contacted,
  qualified,
  preQualified,
  appointment,
  testDrive,
  negotiation,
  closed,
  lost,
}

enum LeadPriority {
  high,
  medium,
  low,
}

enum LeadSentiment {
  positive,
  neutral,
  negative,
}

class Lead {
  final String id;
  final String tenantId;
  final String? assignedTo;
  final LeadSource source;
  final LeadStatus status;
  final LeadContact contact;
  final List<String>? interestedVehicles;
  final String notes;
  final LeadAIClassification? aiClassification;
  final LeadScore? score;
  final List<String>? tags;
  final List<LeadDocument>? documents;
  final List<Interaction> interactions;
  final DateTime createdAt;
  final DateTime updatedAt;

  Lead({
    required this.id,
    required this.tenantId,
    this.assignedTo,
    required this.source,
    required this.status,
    required this.contact,
    this.interestedVehicles,
    required this.notes,
    this.aiClassification,
    this.score,
    this.tags,
    this.documents,
    required this.interactions,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Lead.fromJson(Map<String, dynamic> json) {
    return Lead(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      assignedTo: json['assignedTo'] as String?,
      source: LeadSource.values.firstWhere(
        (e) => e.name == json['source'],
        orElse: () => LeadSource.web,
      ),
      status: LeadStatus.values.firstWhere(
        (e) => e.name == json['status']?.replaceAll('_', ''),
        orElse: () => LeadStatus.new_,
      ),
      contact: LeadContact.fromJson(json['contact'] as Map<String, dynamic>),
      interestedVehicles: json['interestedVehicles'] != null
          ? List<String>.from(json['interestedVehicles'] as List)
          : null,
      notes: json['notes'] as String? ?? '',
      aiClassification: json['aiClassification'] != null
          ? LeadAIClassification.fromJson(json['aiClassification'] as Map<String, dynamic>)
          : null,
      score: json['score'] != null
          ? LeadScore.fromJson(json['score'] as Map<String, dynamic>)
          : null,
      tags: json['tags'] != null ? List<String>.from(json['tags'] as List) : null,
      documents: json['documents'] != null
          ? (json['documents'] as List)
              .map((e) => LeadDocument.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      interactions: (json['interactions'] as List? ?? [])
          .map((e) => Interaction.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: _parseTimestamp(json['createdAt']),
      updatedAt: _parseTimestamp(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'assignedTo': assignedTo,
      'source': source.name,
      'status': status.name.replaceAll('_', ''),
      'contact': contact.toJson(),
      'interestedVehicles': interestedVehicles,
      'notes': notes,
      'aiClassification': aiClassification?.toJson(),
      'score': score?.toJson(),
      'tags': tags,
      'documents': documents?.map((e) => e.toJson()).toList(),
      'interactions': interactions.map((e) => e.toJson()).toList(),
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class LeadContact {
  final String name;
  final String? email;
  final String phone;
  final String preferredChannel;

  LeadContact({
    required this.name,
    this.email,
    required this.phone,
    required this.preferredChannel,
  });

  factory LeadContact.fromJson(Map<String, dynamic> json) {
    return LeadContact(
      name: json['name'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String,
      preferredChannel: json['preferredChannel'] as String? ?? 'whatsapp',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'phone': phone,
      'preferredChannel': preferredChannel,
    };
  }
}

class LeadAIClassification {
  final LeadPriority priority;
  final LeadSentiment sentiment;
  final String intent;

  LeadAIClassification({
    required this.priority,
    required this.sentiment,
    required this.intent,
  });

  factory LeadAIClassification.fromJson(Map<String, dynamic> json) {
    return LeadAIClassification(
      priority: LeadPriority.values.firstWhere(
        (e) => e.name == json['priority'],
        orElse: () => LeadPriority.medium,
      ),
      sentiment: LeadSentiment.values.firstWhere(
        (e) => e.name == json['sentiment'],
        orElse: () => LeadSentiment.neutral,
      ),
      intent: json['intent'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'priority': priority.name,
      'sentiment': sentiment.name,
      'intent': intent,
    };
  }
}

class LeadScore {
  final double automatic;
  final double? manual;
  final double combined;
  final DateTime lastUpdated;
  final List<ScoreHistory> history;

  LeadScore({
    required this.automatic,
    this.manual,
    required this.combined,
    required this.lastUpdated,
    required this.history,
  });

  factory LeadScore.fromJson(Map<String, dynamic> json) {
    return LeadScore(
      automatic: (json['automatic'] as num).toDouble(),
      manual: json['manual'] != null ? (json['manual'] as num).toDouble() : null,
      combined: (json['combined'] as num).toDouble(),
      lastUpdated: _parseTimestamp(json['lastUpdated']),
      history: (json['history'] as List? ?? [])
          .map((e) => ScoreHistory.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'automatic': automatic,
      'manual': manual,
      'combined': combined,
      'lastUpdated': lastUpdated,
      'history': history.map((e) => e.toJson()).toList(),
    };
  }
}

class ScoreHistory {
  final double score;
  final String type;
  final String? reason;
  final String? updatedBy;
  final DateTime updatedAt;

  ScoreHistory({
    required this.score,
    required this.type,
    this.reason,
    this.updatedBy,
    required this.updatedAt,
  });

  factory ScoreHistory.fromJson(Map<String, dynamic> json) {
    return ScoreHistory(
      score: (json['score'] as num).toDouble(),
      type: json['type'] as String,
      reason: json['reason'] as String?,
      updatedBy: json['updatedBy'] as String?,
      updatedAt: _parseTimestamp(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'score': score,
      'type': type,
      'reason': reason,
      'updatedBy': updatedBy,
      'updatedAt': updatedAt,
    };
  }
}

class LeadDocument {
  final String id;
  final String name;
  final String type;
  final String url;
  final String uploadedBy;
  final DateTime uploadedAt;
  final int? size;
  final String? mimeType;

  LeadDocument({
    required this.id,
    required this.name,
    required this.type,
    required this.url,
    required this.uploadedBy,
    required this.uploadedAt,
    this.size,
    this.mimeType,
  });

  factory LeadDocument.fromJson(Map<String, dynamic> json) {
    return LeadDocument(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      url: json['url'] as String,
      uploadedBy: json['uploadedBy'] as String,
      uploadedAt: _parseTimestamp(json['uploadedAt']),
      size: json['size'] as int?,
      mimeType: json['mimeType'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'url': url,
      'uploadedBy': uploadedBy,
      'uploadedAt': uploadedAt,
      'size': size,
      'mimeType': mimeType,
    };
  }
}

class Interaction {
  final String id;
  final InteractionType type;
  final String content;
  final String userId;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  Interaction({
    required this.id,
    required this.type,
    required this.content,
    required this.userId,
    required this.createdAt,
    this.metadata,
  });

  factory Interaction.fromJson(Map<String, dynamic> json) {
    return Interaction(
      id: json['id'] as String,
      type: InteractionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => InteractionType.note,
      ),
      content: json['content'] as String,
      userId: json['userId'] as String,
      createdAt: _parseTimestamp(json['createdAt']),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'content': content,
      'userId': userId,
      'createdAt': Timestamp.fromDate(createdAt),
      'metadata': metadata,
    };
  }
}

enum InteractionType {
  message,
  call,
  email,
  note,
  appointment,
  task,
  document,
  workflow,
}


