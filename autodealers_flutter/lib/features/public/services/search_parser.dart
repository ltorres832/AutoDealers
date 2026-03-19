// Parser de búsquedas avanzadas - Replica exacta de Next.js
class SearchQuery {
  final String? make;
  final String? model;
  final int? yearMin;
  final int? yearMax;
  final double? priceMax;
  final int? mileageMax;
  final String? fuelType;
  final String? transmission;
  final String? condition;
  final String? bodyType;
  final String rawQuery;

  SearchQuery({
    this.make,
    this.model,
    this.yearMin,
    this.yearMax,
    this.priceMax,
    this.mileageMax,
    this.fuelType,
    this.transmission,
    this.condition,
    this.bodyType,
    required this.rawQuery,
  });

  Map<String, String> toFilters() {
    return {
      'make': make ?? 'all',
      'model': model ?? '',
      'yearMin': yearMin?.toString() ?? '',
      'yearMax': yearMax?.toString() ?? '',
      'priceMax': priceMax?.toString() ?? '',
      'mileageMax': mileageMax?.toString() ?? '',
      'fuelType': fuelType ?? 'all',
      'transmission': transmission ?? 'all',
      'condition': condition ?? 'all',
      'bodyType': bodyType ?? 'all',
      'location': '',
    };
  }
}

class SearchParser {
  static SearchQuery parse(String query) {
    final lowerQuery = query.toLowerCase().trim();
    
    String? make;
    String? model;
    int? yearMin;
    int? yearMax;
    double? priceMax;
    int? mileageMax;
    String? fuelType;
    String? transmission;
    String? condition;
    String? bodyType;

    // Parsear marca
    final makes = [
      'toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes',
      'audi', 'tesla', 'hyundai', 'mazda', 'jeep', 'volkswagen', 'subaru',
      'lexus', 'acura', 'infiniti', 'cadillac', 'gmc', 'ram', 'dodge',
      'chrysler', 'buick', 'lincoln', 'volvo', 'porsche', 'jaguar', 'land rover',
      'mini', 'fiat', 'alfa romeo', 'genesis', 'mitsubishi', 'kia'
    ];
    
    for (final m in makes) {
      if (lowerQuery.contains(m)) {
        make = m.substring(0, 1).toUpperCase() + m.substring(1);
        break;
      }
    }

    // Parsear modelo (después de la marca)
    if (make != null) {
      final makeIndex = lowerQuery.indexOf(make.toLowerCase());
      if (makeIndex != -1) {
        final afterMake = lowerQuery.substring(makeIndex + make.length).trim();
        final modelMatch = RegExp(r'^([a-z0-9\s-]+?)(?:\s+\d{4}|$)').firstMatch(afterMake);
        if (modelMatch != null) {
          model = modelMatch.group(1)?.trim();
          if (model != null && model.isNotEmpty) {
            // Capitalizar primera letra de cada palabra
            model = model.split(' ').map((w) => 
              w.isEmpty ? '' : w[0].toUpperCase() + w.substring(1)
            ).join(' ');
          }
        }
      }
    }

    // Parsear años (formato: 2020-2023, 2020+, 2020-2022)
    final yearRangeMatch = RegExp(r'(\d{4})\s*[-–]\s*(\d{4})').firstMatch(lowerQuery);
    if (yearRangeMatch != null) {
      yearMin = int.tryParse(yearRangeMatch.group(1) ?? '');
      yearMax = int.tryParse(yearRangeMatch.group(2) ?? '');
    } else {
      final yearPlusMatch = RegExp(r'(\d{4})\s*\+').firstMatch(lowerQuery);
      if (yearPlusMatch != null) {
        yearMin = int.tryParse(yearPlusMatch.group(1) ?? '');
      } else {
        final singleYearMatch = RegExp(r'\b(19|20)\d{2}\b').firstMatch(lowerQuery);
        if (singleYearMatch != null) {
          final year = int.tryParse(singleYearMatch.group(0) ?? '');
          if (year != null) {
            yearMin = year;
            yearMax = year;
          }
        }
      }
    }

    // Parsear precio (formato: bajo $35,000, menos de $50k, bajo 35000)
    final priceMatch = RegExp(r'(?:bajo|menos\s+de|under|below)\s*\$?\s*(\d+(?:,\d{3})*(?:k|k)?)').firstMatch(lowerQuery);
    if (priceMatch != null) {
      var priceStr = priceMatch.group(1)?.replaceAll(',', '').replaceAll('k', '000') ?? '';
      priceMax = double.tryParse(priceStr);
    }

    // Parsear millas (formato: menos de 50k millas, con menos de 50000 millas)
    final mileageMatch = RegExp(r'(?:menos\s+de|con\s+menos\s+de|under|below)\s*(\d+(?:,\d{3})*(?:k|k)?)\s*(?:millas|miles|mi)').firstMatch(lowerQuery);
    if (mileageMatch != null) {
      var mileageStr = mileageMatch.group(1)?.replaceAll(',', '').replaceAll('k', '000') ?? '';
      mileageMax = int.tryParse(mileageStr);
    }

    // Parsear tipo de combustible
    if (lowerQuery.contains('híbrido') || lowerQuery.contains('hybrid')) {
      fuelType = 'hybrid';
    } else if (lowerQuery.contains('eléctrico') || lowerQuery.contains('electric')) {
      fuelType = 'electric';
    } else if (lowerQuery.contains('diésel') || lowerQuery.contains('diesel')) {
      fuelType = 'diesel';
    } else if (lowerQuery.contains('gasolina') || lowerQuery.contains('gasoline')) {
      fuelType = 'gasoline';
    }

    // Parsear transmisión
    if (lowerQuery.contains('automática') || lowerQuery.contains('automatic')) {
      transmission = 'automatic';
    } else if (lowerQuery.contains('manual')) {
      transmission = 'manual';
    } else if (lowerQuery.contains('cvt')) {
      transmission = 'cvt';
    }

    // Parsear condición
    if (lowerQuery.contains('nuevo') || lowerQuery.contains('new')) {
      condition = 'new';
    } else if (lowerQuery.contains('usado') || lowerQuery.contains('used')) {
      condition = 'used';
    } else if (lowerQuery.contains('certificado') || lowerQuery.contains('certified')) {
      condition = 'certified';
    }

    // Parsear tipo de vehículo
    final bodyTypes = {
      'suv': ['suv'],
      'sedan': ['sedan', 'sedán'],
      'pickup': ['pickup', 'pick-up', 'truck'],
      'coupe': ['coupe', 'cupé'],
      'hatchback': ['hatchback'],
      'wagon': ['wagon'],
      'convertible': ['convertible'],
      'minivan': ['minivan'],
      'van': ['van'],
      'luxury': ['luxury', 'lujo'],
      'crossover': ['crossover'],
    };

    for (final entry in bodyTypes.entries) {
      if (entry.value.any((bt) => lowerQuery.contains(bt))) {
        bodyType = entry.key;
        break;
      }
    }

    return SearchQuery(
      make: make,
      model: model,
      yearMin: yearMin,
      yearMax: yearMax,
      priceMax: priceMax,
      mileageMax: mileageMax,
      fuelType: fuelType,
      transmission: transmission,
      condition: condition,
      bodyType: bodyType,
      rawQuery: query,
    );
  }
}


