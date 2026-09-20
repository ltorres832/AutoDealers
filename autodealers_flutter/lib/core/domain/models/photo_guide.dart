/// Ángulos de la guía de fotos (alineados con inventory-compete web).
class PhotoGuideAngle {
  final String id;
  final String label;
  final String hint;

  const PhotoGuideAngle({
    required this.id,
    required this.label,
    required this.hint,
  });
}

const List<PhotoGuideAngle> kPhotoGuideAngles = [
  PhotoGuideAngle(
    id: 'front',
    label: 'Frente',
    hint: 'Cámara a la altura del capó, centrado',
  ),
  PhotoGuideAngle(
    id: 'front_left',
    label: '3/4 frontal izquierdo',
    hint: 'Ángulo 45° del lado del conductor',
  ),
  PhotoGuideAngle(
    id: 'side_left',
    label: 'Lateral izquierdo',
    hint: 'Perfil completo, ruedas visibles',
  ),
  PhotoGuideAngle(
    id: 'rear_left',
    label: '3/4 trasero izquierdo',
    hint: 'Ángulo 45° desde atrás',
  ),
  PhotoGuideAngle(
    id: 'rear',
    label: 'Trasera',
    hint: 'Centrado, luces y placa visibles',
  ),
  PhotoGuideAngle(
    id: 'rear_right',
    label: '3/4 trasero derecho',
    hint: 'Ángulo 45° desde atrás',
  ),
  PhotoGuideAngle(
    id: 'side_right',
    label: 'Lateral derecho',
    hint: 'Perfil completo',
  ),
  PhotoGuideAngle(
    id: 'front_right',
    label: '3/4 frontal derecho',
    hint: 'Ángulo 45° del lado del pasajero',
  ),
  PhotoGuideAngle(
    id: 'interior_dash',
    label: 'Interior / tablero',
    hint: 'Desde el asiento del conductor',
  ),
  PhotoGuideAngle(
    id: 'interior_rear',
    label: 'Asientos traseros',
    hint: 'Puerta abierta o desde atrás',
  ),
];

class VehiclePhotoSlot {
  final String angleId;
  final String originalUrl;
  final String? editedUrl;
  final String? sceneId;
  final String? createdAt;

  const VehiclePhotoSlot({
    required this.angleId,
    required this.originalUrl,
    this.editedUrl,
    this.sceneId,
    this.createdAt,
  });

  factory VehiclePhotoSlot.fromJson(Map<String, dynamic> json) {
    return VehiclePhotoSlot(
      angleId: (json['angleId'] ?? '').toString(),
      originalUrl: (json['originalUrl'] ?? '').toString(),
      editedUrl: json['editedUrl']?.toString(),
      sceneId: json['sceneId']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'angleId': angleId,
        'originalUrl': originalUrl,
        if (editedUrl != null) 'editedUrl': editedUrl,
        if (sceneId != null) 'sceneId': sceneId,
        if (createdAt != null) 'createdAt': createdAt,
      };

  String get displayUrl {
    final edited = editedUrl?.trim();
    if (edited != null && edited.isNotEmpty) return edited;
    return originalUrl;
  }
}
