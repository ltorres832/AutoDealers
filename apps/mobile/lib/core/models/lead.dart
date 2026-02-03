/// Modelo de Lead
class Lead {
  final String id;
  final String tenantId;
  final String source;
  final String status;
  final LeadContact contact;
  final String notes;
  final List<LeadInteraction> interactions;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? sellerId;
  final String? assignedTo;

  Lead({
    required this.id,
    required this.tenantId,
    required this.source,
    required this.status,
    required this.contact,
    required this.notes,
    required this.interactions,
    required this.createdAt,
    required this.updatedAt,
    this.sellerId,
    this.assignedTo,
  });

  factory Lead.fromFirestore(Map<String, dynamic> data, String id) {
    return Lead(
      id: id,
      tenantId: data['tenantId'] ?? '',
      source: data['source'] ?? '',
      status: data['status'] ?? 'new',
      contact: LeadContact.fromMap(data['contact'] ?? {}),
      notes: data['notes'] ?? '',
      interactions: (data['interactions'] as List<dynamic>?)
              ?.map((i) => LeadInteraction.fromMap(i))
              .toList() ??
          [],
      createdAt: _parseTimestamp(data['createdAt']),
      updatedAt: _parseTimestamp(data['updatedAt']),
      sellerId: data['sellerId'],
      assignedTo: data['assignedTo'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'tenantId': tenantId,
      'source': source,
      'status': status,
      'contact': contact.toMap(),
      'notes': notes,
      'interactions': interactions.map((i) => i.toMap()).toList(),
      'sellerId': sellerId,
      'assignedTo': assignedTo,
    };
  }

  static DateTime _parseTimestamp(dynamic timestamp) {
    if (timestamp == null) return DateTime.now();
    if (timestamp is DateTime) return timestamp;
    if (timestamp is String) return DateTime.parse(timestamp);
    return DateTime.now();
  }
}

class LeadContact {
  final String name;
  final String? email;
  final String phone;
  final String? preferredChannel;

  LeadContact({
    required this.name,
    this.email,
    required this.phone,
    this.preferredChannel,
  });

  factory LeadContact.fromMap(Map<String, dynamic> map) {
    return LeadContact(
      name: map['name'] ?? '',
      email: map['email'],
      phone: map['phone'] ?? '',
      preferredChannel: map['preferredChannel'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'phone': phone,
      'preferredChannel': preferredChannel,
    };
  }
}

class LeadInteraction {
  final String type;
  final String description;
  final DateTime createdAt;
  final String? userId;

  LeadInteraction({
    required this.type,
    required this.description,
    required this.createdAt,
    this.userId,
  });

  factory LeadInteraction.fromMap(Map<String, dynamic> map) {
    return LeadInteraction(
      type: map['type'] ?? '',
      description: map['description'] ?? '',
      createdAt: Lead._parseTimestamp(map['createdAt']),
      userId: map['userId'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'type': type,
      'description': description,
      'createdAt': createdAt.toIso8601String(),
      'userId': userId,
    };
  }
}


