// Modelo de Cita - Domain Layer
import 'package:cloud_firestore/cloud_firestore.dart';

enum AppointmentType {
  consultation,
  testDrive,
  delivery,
}

enum AppointmentStatus {
  scheduled,
  confirmed,
  completed,
  cancelled,
  noShow,
}

enum ReminderChannel {
  email,
  sms,
  whatsapp,
}

class Reminder {
  final String id;
  final DateTime sentAt;
  final ReminderChannel channel;
  final ReminderStatus status;

  Reminder({
    required this.id,
    required this.sentAt,
    required this.channel,
    required this.status,
  });

  factory Reminder.fromJson(Map<String, dynamic> json) {
    return Reminder(
      id: json['id'] as String,
      sentAt: json['sentAt'] is Timestamp
          ? (json['sentAt'] as Timestamp).toDate()
          : DateTime.parse(json['sentAt'].toString()),
      channel: ReminderChannel.values.firstWhere(
        (e) => e.name == json['channel'],
        orElse: () => ReminderChannel.email,
      ),
      status: ReminderStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ReminderStatus.pending,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sentAt': Timestamp.fromDate(sentAt),
      'channel': channel.name,
      'status': status.name,
    };
  }
}

enum ReminderStatus {
  pending,
  sent,
  failed,
}

class Appointment {
  final String id;
  final String tenantId;
  final String leadId;
  final String assignedTo;
  final List<String> vehicleIds;
  final AppointmentType type;
  final DateTime scheduledAt;
  final int duration; // minutos
  final AppointmentStatus status;
  final String? location;
  final String? notes;
  final List<Reminder> reminders;
  final DateTime createdAt;
  final DateTime updatedAt;

  Appointment({
    required this.id,
    required this.tenantId,
    required this.leadId,
    required this.assignedTo,
    required this.vehicleIds,
    required this.type,
    required this.scheduledAt,
    required this.duration,
    required this.status,
    this.location,
    this.notes,
    required this.reminders,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    return Appointment(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      leadId: json['leadId'] as String,
      assignedTo: json['assignedTo'] as String,
      vehicleIds: List<String>.from(json['vehicleIds'] as List),
      type: AppointmentType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => AppointmentType.consultation,
      ),
      scheduledAt: json['scheduledAt'] is Timestamp
          ? (json['scheduledAt'] as Timestamp).toDate()
          : DateTime.parse(json['scheduledAt'].toString()),
      duration: json['duration'] as int,
      status: AppointmentStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AppointmentStatus.scheduled,
      ),
      location: json['location'] as String?,
      notes: json['notes'] as String?,
      reminders: (json['reminders'] as List? ?? [])
          .map((e) => Reminder.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: json['createdAt'] is Timestamp
          ? (json['createdAt'] as Timestamp).toDate()
          : DateTime.parse(json['createdAt'].toString()),
      updatedAt: json['updatedAt'] is Timestamp
          ? (json['updatedAt'] as Timestamp).toDate()
          : DateTime.parse(json['updatedAt'].toString()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'leadId': leadId,
      'assignedTo': assignedTo,
      'vehicleIds': vehicleIds,
      'type': type.name,
      'scheduledAt': Timestamp.fromDate(scheduledAt),
      'duration': duration,
      'status': status.name,
      'location': location,
      'notes': notes,
      'reminders': reminders.map((e) => e.toJson()).toList(),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  // Getters de compatibilidad
  DateTime get dateTime => scheduledAt;
  String get title => type.name.toUpperCase();
  String? get leadName => null; // Se obtiene del lead asociado
}


