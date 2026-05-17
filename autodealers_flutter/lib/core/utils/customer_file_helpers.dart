import 'expedition_labels.dart';

String customerFileDisplayName(Map<String, dynamic> file) {
  final info = file['customerInfo'];
  if (info is Map) {
    final name = info['fullName']?.toString().trim();
    if (name != null && name.isNotEmpty) return name;
  }
  return file['customerName']?.toString() ?? 'Sin nombre';
}

String customerFilePhone(Map<String, dynamic> file) {
  final info = file['customerInfo'];
  if (info is Map) {
    return info['phone']?.toString() ?? '';
  }
  return '';
}

String customerFileStatusLabel(String? status) {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'completed':
      return 'Completado';
    case 'archived':
      return 'Archivado';
    case 'deleted':
      return 'Eliminado';
    default:
      return status ?? '—';
  }
}

String customerFileExpeditionLabel(Map<String, dynamic> file) {
  return expeditionStageLabel(file['expeditionStage']?.toString());
}
