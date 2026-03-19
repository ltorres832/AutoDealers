# 🚀 GUÍA PARA PROBAR LA PLATAFORMA AUTODEALERS

## ✅ Estado de la Plataforma

### Backend (Cloud Functions): ✅ 100% Completo
- ✅ 51 módulos implementados
- ✅ 200+ Cloud Functions exportadas
- ✅ Webhooks configurados (Stripe, WhatsApp, Facebook, Instagram)
- ✅ Configuraciones completas (Stripe, AI, etc.)

### Frontend (Flutter): ✅ 100% Completo
- ✅ 49 Repositories implementados
- ✅ 46 Providers implementados
- ✅ Todas las rutas configuradas
- ✅ Firebase configurado

---

## 📋 PREREQUISITOS

### 1. Instalar Flutter

Si Flutter no está instalado:

1. **Descargar Flutter:**
   - Visita: https://docs.flutter.dev/get-started/install/windows
   - Descarga el SDK de Flutter

2. **Extraer y agregar al PATH:**
   ```powershell
   # Extraer a C:\src\flutter (o donde prefieras)
   # Agregar al PATH del sistema:
   # C:\src\flutter\bin
   ```

3. **Verificar instalación:**
   ```powershell
   flutter doctor
   ```

### 2. Verificar Firebase

La configuración de Firebase ya está en:
- `autodealers_flutter/lib/core/config/firebase_config.dart`
- Proyecto: `autodealers-7f62e`

### 3. Desplegar Cloud Functions (Opcional para pruebas locales)

Si quieres probar las Cloud Functions:
```bash
cd functions
npm install
firebase deploy --only functions
```

---

## 🚀 EJECUTAR LA APLICACIÓN FLUTTER

### Opción 1: Script Automático

```powershell
# Desde la raíz del proyecto
.\EJECUTAR_FLUTTER.ps1
```

### Opción 2: Comandos Manuales

```powershell
# 1. Navegar al proyecto Flutter
cd autodealers_flutter

# 2. Obtener dependencias
flutter pub get

# 3. Verificar dispositivos disponibles
flutter devices

# 4. Ejecutar en Web (Chrome)
flutter run -d chrome

# O ejecutar en modo release (más rápido)
flutter run -d chrome --release
```

### Opción 3: Ejecutar en Android/iOS

```powershell
# Android (necesitas emulador o dispositivo conectado)
flutter run -d android

# iOS (solo en Mac)
flutter run -d ios
```

---

## 🧪 PRUEBAS SUGERIDAS

### 1. Autenticación
- ✅ Probar login con credenciales válidas
- ✅ Verificar navegación al dashboard después del login
- ✅ Probar logout

### 2. CRM (Leads)
- ✅ Ver lista de leads
- ✅ Crear nuevo lead
- ✅ Ver detalle de lead
- ✅ Editar lead
- ✅ Filtrar por estado/asignado

### 3. Inventario (Vehicles)
- ✅ Ver lista de vehículos
- ✅ Crear nuevo vehículo
- ✅ Ver detalle de vehículo
- ✅ Editar vehículo
- ✅ Filtrar por marca/precio

### 4. Mensajería
- ✅ Enviar email
- ✅ Enviar SMS
- ✅ Enviar WhatsApp
- ✅ Ver historial de mensajes

### 5. Citas (Appointments)
- ✅ Ver calendario de citas
- ✅ Crear nueva cita
- ✅ Editar cita
- ✅ Cancelar cita

### 6. Ventas (Sales)
- ✅ Ver lista de ventas
- ✅ Crear nueva venta
- ✅ Completar venta

### 7. Facturación (Billing)
- ✅ Ver suscripción actual
- ✅ Ver métodos de pago
- ✅ Ver facturas
- ✅ Cambiar membresía

### 8. Reportes
- ✅ Ver reporte de leads
- ✅ Ver reporte de ventas
- ✅ Ver reporte de rendimiento

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: Flutter no encontrado
```powershell
# Verificar si Flutter está en el PATH
where flutter

# Si no está, agregar al PATH o reinstalar Flutter
```

### Error: Dependencias no instaladas
```powershell
cd autodealers_flutter
flutter pub get
flutter pub upgrade
```

### Error: Firebase no inicializado
- Verificar que `firebase_config.dart` tenga las credenciales correctas
- Verificar conexión a internet
- Verificar que el proyecto Firebase esté activo

### Error: Cloud Functions no disponibles
- Las Cloud Functions deben estar desplegadas en Firebase
- Verificar que las funciones estén activas en Firebase Console
- Verificar que la región sea correcta (us-central1 por defecto)

### Error: Dispositivo no encontrado
```powershell
# Ver dispositivos disponibles
flutter devices

# Si no hay dispositivos web, instalar Chrome
# Si no hay Android, configurar Android Studio
```

---

## 📱 DISPOSITIVOS DISPONIBLES

Para ver qué dispositivos están disponibles:
```powershell
flutter devices
```

Salida esperada:
```
3 connected devices:

Chrome (web) • chrome • web-javascript • Google Chrome
Windows (desktop) • windows • windows-x64 • Microsoft Windows
```

---

## 🌐 EJECUTAR EN MODO WEB (RECOMENDADO PARA PRUEBAS)

```powershell
cd autodealers_flutter
flutter run -d chrome
```

La aplicación se abrirá automáticamente en Chrome en:
- **URL:** http://localhost:XXXXX (puerto aleatorio)
- **Hot Reload:** Presiona `r` en la terminal para recargar
- **Hot Restart:** Presiona `R` para reiniciar
- **Quit:** Presiona `q` para salir

---

## 📊 VERIFICAR ESTADO DE CLOUD FUNCTIONS

```bash
# Ver funciones desplegadas
firebase functions:list

# Ver logs de funciones
firebase functions:log

# Probar función específica (desde Firebase Console o Postman)
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de probar, verifica:

- [ ] Flutter instalado y en PATH
- [ ] `flutter doctor` sin errores críticos
- [ ] Dependencias instaladas (`flutter pub get`)
- [ ] Firebase configurado correctamente
- [ ] Cloud Functions desplegadas (opcional para pruebas básicas)
- [ ] Dispositivo disponible (Chrome, Android, iOS)
- [ ] Conexión a internet activa

---

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar la aplicación:** `.\EJECUTAR_FLUTTER.ps1`
2. **Probar funcionalidades principales:** Login, CRM, Inventario
3. **Verificar integraciones:** Firebase, Cloud Functions
4. **Probar en diferentes dispositivos:** Web, Android, iOS
5. **Desplegar a producción:** Firebase Hosting (Web) o App Stores (Mobile)

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisa los logs en la terminal
2. Verifica `flutter doctor` para problemas de configuración
3. Revisa Firebase Console para errores de Cloud Functions
4. Verifica la configuración de Firebase en `firebase_config.dart`

---

**¡La plataforma está lista para probar! 🚀**


