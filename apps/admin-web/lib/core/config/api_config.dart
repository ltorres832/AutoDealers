// Configuración de API - Consume las APIs existentes de Next.js
class ApiConfig {
  // URL base de las APIs (Next.js API Routes)
  // En producción, esto apunta a tu servidor Next.js
  static String get baseUrl {
    // Puedes usar variables de entorno o configurar según el ambiente
    const env = String.fromEnvironment('API_URL');
    if (env.isNotEmpty) return env;
    
    // Por defecto, apunta a localhost en desarrollo
    // En producción, cambiar a tu dominio real
    return 'http://localhost:3001/api';
  }
  
  // Headers comunes para todas las requests
  static Map<String, String> getHeaders(String? authToken) {
    return {
      'Content-Type': 'application/json',
      if (authToken != null) 'Authorization': 'Bearer $authToken',
    };
  }
}


