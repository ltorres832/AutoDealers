import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../config/api_config.dart';

String publicWebBaseUrl() => kPublicWebBaseUrl.replaceAll(RegExp(r'/$'), '');

String buildVehicleShareUrl({
  required String tenantId,
  required String vehicleId,
}) {
  final base = publicWebBaseUrl();
  return '$base/share/${Uri.encodeComponent(tenantId)}/${Uri.encodeComponent(vehicleId)}';
}

/// Comparte el link del vehículo (Clipboard + SnackBar; sin share_plus).
Future<void> shareVehicleLink(
  BuildContext context, {
  required String tenantId,
  required String vehicleId,
  String? label,
}) async {
  if (tenantId.isEmpty || vehicleId.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se puede compartir: falta tenant o vehículo')),
    );
    return;
  }
  final url = buildVehicleShareUrl(tenantId: tenantId, vehicleId: vehicleId);
  await Clipboard.setData(ClipboardData(text: url));
  if (!context.mounted) return;
  final prefix = label != null && label.isNotEmpty ? '$label — ' : '';
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('${prefix}Link copiado al portapapeles')),
  );
}
