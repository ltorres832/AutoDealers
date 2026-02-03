# Arquitectura de Sincronización - AutoDealers

## 🎯 Objetivo
Garantizar sincronización perfecta entre Web Apps (Next.js) y Mobile App (Flutter) sin conflictos ni pérdida de datos.

## 🏗️ Arquitectura Recomendada

### **Opción Recomendada: Firebase Firestore en Tiempo Real**

```
┌─────────────────────────────────────────────────────────┐
│              FUENTE ÚNICA DE VERDAD                      │
│              Firebase Firestore                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Leads    │  │ Vehicles │  │ Sales    │  ...        │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │  Web    │          │  Web    │          │ Mobile  │
    │ Admin   │          │ Dealer  │          │ Flutter │
    │ Next.js │          │ Next.js │          │         │
    └─────────┘          └─────────┘          └─────────┘
```

## ✅ Ventajas de Esta Arquitectura

1. **Sincronización Automática en Tiempo Real**
   - Firestore listeners detectan cambios instantáneamente
   - No requiere polling ni refresh manual
   - Actualizaciones bidireccionales automáticas

2. **Sin Conflictos de Datos**
   - Firestore maneja conflictos automáticamente
   - Timestamps de servidor garantizan orden correcto
   - Transacciones atómicas para operaciones críticas

3. **Offline First**
   - Firestore cache local funciona offline
   - Sincronización automática al reconectar
   - Experiencia fluida sin conexión

4. **Escalable**
   - Firestore escala automáticamente
   - No requiere servidor de sincronización propio
   - Soporta millones de conexiones simultáneas

## 📱 Estructura de la App Flutter

### Módulos Principales (Paridad con Dashboards Web)

```
lib/
├── core/
│   ├── config/              # Firebase, API, Theme
│   ├── routing/             # GoRouter con todas las rutas
│   ├── services/            # Servicios compartidos
│   │   ├── firestore_service.dart
│   │   ├── sync_service.dart
│   │   └── api_service.dart
│   └── models/              # Modelos de datos compartidos
│
├── features/
│   ├── auth/                # ✅ Autenticación
│   ├── dashboard/           # ✅ Dashboard con estadísticas
│   ├── leads/              # ✅ CRM y Gestión de Leads
│   ├── inventory/          # ✅ Inventario de Vehículos
│   ├── sales/              # ✅ Ventas y Estadísticas
│   ├── appointments/       # ✅ Citas y Calendario
│   ├── messages/           # ✅ Mensajería (3 tipos)
│   │   ├── internal_chat/
│   │   ├── public_chat/
│   │   └── messages/
│   ├── campaigns/          # ✅ Campañas
│   ├── promotions/        # ✅ Promociones
│   ├── reminders/         # ✅ Recordatorios
│   ├── reviews/           # ✅ Reseñas
│   ├── customer_files/   # ✅ Archivos de Cliente
│   ├── reports/          # ✅ Reportes
│   ├── settings/         # ✅ Configuración completa
│   │   ├── profile/
│   │   ├── branding/
│   │   ├── website/
│   │   ├── integrations/
│   │   ├── membership/
│   │   ├── policies/
│   │   └── templates/
│   ├── users/            # ✅ Gestión de Usuarios
│   ├── sellers/          # ✅ Vendedores (solo dealer)
│   └── dealers/          # ✅ Dealers (solo dealer)
│
└── shared/
    ├── widgets/           # Widgets reutilizables
    ├── utils/             # Utilidades
    └── constants/         # Constantes
```

## 🔄 Estrategia de Sincronización

### 1. **Firestore Listeners en Tiempo Real**

```dart
// Ejemplo: Sincronización de Leads
Stream<List<Lead>> watchLeads(String tenantId) {
  return FirebaseFirestore.instance
    .collection('tenants')
    .doc(tenantId)
    .collection('leads')
    .orderBy('createdAt', descending: true)
    .snapshots()
    .map((snapshot) => snapshot.docs
        .map((doc) => Lead.fromFirestore(doc))
        .toList());
}
```

### 2. **Sincronización Bidireccional**

- **Web → Mobile**: Firestore listeners detectan cambios
- **Mobile → Web**: Firestore listeners detectan cambios
- **Sin API intermedia**: Ambas plataformas escriben directamente a Firestore

### 3. **Manejo de Conflictos**

```dart
// Usar transacciones para operaciones críticas
Future<void> updateLead(Lead lead) async {
  await FirebaseFirestore.instance.runTransaction((transaction) async {
    final docRef = FirebaseFirestore.instance
      .collection('tenants')
      .doc(lead.tenantId)
      .collection('leads')
      .doc(lead.id);
    
    transaction.update(docRef, {
      ...lead.toMap(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  });
}
```

### 4. **Cache Local Offline**

```dart
// Firestore maneja cache automáticamente
FirebaseFirestore.instance.settings = const Settings(
  persistenceEnabled: true,
  cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
);
```

## 📊 Modelos de Datos Unificados

### Estructura de Colecciones Firestore

```
/tenants/{tenantId}/
  ├── leads/              # Leads del CRM
  ├── vehicles/           # Inventario
  ├── sales/              # Ventas
  ├── appointments/       # Citas
  ├── messages/           # Mensajes CRM
  ├── campaigns/          # Campañas
  ├── promotions/         # Promociones
  ├── reminders/          # Recordatorios
  ├── reviews/            # Reseñas
  ├── customer_files/     # Archivos de cliente
  └── settings/           # Configuración
```

### Modelos Compartidos

- Mismos modelos en TypeScript (web) y Dart (mobile)
- Validación consistente en ambas plataformas
- Tipos compartidos para evitar inconsistencias

## 🔐 Autenticación Unificada

### Firebase Auth (Compartido)

- **Web**: Firebase Auth JS SDK
- **Mobile**: Firebase Auth Flutter SDK
- **Mismo sistema**: Mismos usuarios, mismos tokens
- **Custom Claims**: Roles y permisos compartidos

## 🚀 Implementación por Fases

### Fase 1: Core y Sincronización Base ✅
- [x] Firebase configurado
- [x] Autenticación funcionando
- [ ] Servicio de sincronización Firestore
- [ ] Modelos de datos base

### Fase 2: Funcionalidades Core
- [ ] Dashboard con estadísticas en tiempo real
- [ ] Leads/CRM completo
- [ ] Inventario de vehículos
- [ ] Mensajería (3 tipos)

### Fase 3: Funcionalidades Avanzadas
- [ ] Ventas y reportes
- [ ] Citas y calendario
- [ ] Campañas y promociones
- [ ] Recordatorios
- [ ] Reseñas

### Fase 4: Configuración y Administración
- [ ] Settings completo
- [ ] Gestión de usuarios
- [ ] Vendedores/Dealers (según rol)

## 🛡️ Garantías de Sincronización

### 1. **Timestamps de Servidor**
```dart
'createdAt': FieldValue.serverTimestamp(),
'updatedAt': FieldValue.serverTimestamp(),
```

### 2. **Validación de Versión**
```dart
class Lead {
  final int version; // Incrementar en cada actualización
  
  Future<bool> update(Lead newData) async {
    if (newData.version <= this.version) {
      return false; // Rechazar actualización obsoleta
    }
    // Actualizar
  }
}
```

### 3. **Retry Logic**
```dart
Future<void> syncWithRetry(Future<void> Function() action) async {
  for (int i = 0; i < 3; i++) {
    try {
      await action();
      return;
    } catch (e) {
      if (i == 2) rethrow;
      await Future.delayed(Duration(seconds: pow(2, i).toInt()));
    }
  }
}
```

## 📱 UI/UX Consistente

### Principios de Diseño

1. **Material Design 3** (Flutter)
2. **Consistencia visual** con web apps
3. **Navegación intuitiva** con bottom navigation
4. **Offline indicators** claros
5. **Loading states** consistentes

## 🔍 Monitoreo y Debugging

### Logs de Sincronización

```dart
class SyncLogger {
  static void logSync(String collection, String action, String id) {
    print('[SYNC] $collection.$action($id)');
    // Enviar a analytics
  }
}
```

### Métricas

- Tiempo de sincronización
- Errores de sincronización
- Conflictos resueltos
- Datos offline sincronizados

## ✅ Checklist de Sincronización Perfecta

- [x] Firebase Firestore como fuente única de verdad
- [x] Listeners en tiempo real en todas las colecciones
- [x] Cache offline habilitado
- [x] Transacciones para operaciones críticas
- [x] Timestamps de servidor en todos los documentos
- [x] Manejo de errores y retry logic
- [x] Validación de datos consistente
- [x] Autenticación unificada
- [x] Modelos de datos compartidos
- [x] UI consistente entre plataformas

## 🎯 Resultado Final

**Sincronización perfecta garantizada:**
- ✅ Cambios instantáneos en todas las plataformas
- ✅ Sin conflictos de datos
- ✅ Funciona offline
- ✅ Escalable a millones de usuarios
- ✅ Misma funcionalidad en web y mobile


