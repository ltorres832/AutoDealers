import 'dart:convert';

import 'package:http/http.dart' as http;

class VinDecodeResult {
  final String? make;
  final String? model;
  final int? year;
  final String? bodyType;
  final String? engine;
  final String? fuelType;
  final String? transmission;
  final int? doors;

  const VinDecodeResult({
    this.make,
    this.model,
    this.year,
    this.bodyType,
    this.engine,
    this.fuelType,
    this.transmission,
    this.doors,
  });

  bool get hasAny =>
      (make != null && make!.isNotEmpty) ||
      (model != null && model!.isNotEmpty) ||
      year != null;
}

class VinDecodeService {
  static final _vinRegex = RegExp(r'^[A-HJ-NPR-Z0-9]{11,17}$');

  static String normalizeVin(String raw) {
    return raw.toUpperCase().replaceAll(RegExp(r'[^A-HJ-NPR-Z0-9]'), '');
  }

  static bool isValidVin(String vin) {
    final v = normalizeVin(vin);
    return _vinRegex.hasMatch(v);
  }

  /// Decodifica via NHTSA VPIC (mismo endpoint que el web).
  Future<VinDecodeResult> decode(String vinRaw) async {
    final vin = normalizeVin(vinRaw);
    if (!isValidVin(vin)) {
      throw Exception('VIN inválido. Usa 11–17 caracteres (sin I, O, Q).');
    }

    final uri = Uri.parse(
      'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/$vin?format=json',
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) {
      throw Exception('No se pudo contactar NHTSA (${response.statusCode})');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final results = json['Results'];
    if (results is! List || results.isEmpty) {
      throw Exception('Sin resultados para este VIN');
    }
    final r = results.first as Map<String, dynamic>;
    final make = _titleCase(_nonEmpty(r['Make']));
    final model = _nonEmpty(r['Model']);
    final yearRaw = int.tryParse('${r['ModelYear'] ?? ''}');
    final year = (yearRaw != null && yearRaw > 1950) ? yearRaw : null;
    final engineParts = [
      if (_nonEmpty(r['EngineCylinders']) != null)
        '${r['EngineCylinders']} cil',
      if (_nonEmpty(r['DisplacementL']) != null) '${r['DisplacementL']}L',
    ].join(' ');
    final doors = int.tryParse('${r['Doors'] ?? ''}');

    final result = VinDecodeResult(
      make: make,
      model: model,
      year: year,
      bodyType: _nonEmpty(r['BodyClass']),
      engine: engineParts.isEmpty ? null : engineParts,
      fuelType: _nonEmpty(r['FuelTypePrimary']),
      transmission: _nonEmpty(r['TransmissionStyle']),
      doors: (doors != null && doors > 0) ? doors : null,
    );
    if (!result.hasAny) {
      throw Exception('NHTSA no devolvió marca/modelo/año para este VIN');
    }
    return result;
  }

  static String? _nonEmpty(dynamic v) {
    final s = (v ?? '').toString().trim();
    if (s.isEmpty || s == 'Not Applicable' || s == '0') return null;
    return s;
  }

  static String? _titleCase(String? s) {
    if (s == null || s.isEmpty) return s;
    return s
        .toLowerCase()
        .split(RegExp(r'\s+'))
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }
}
