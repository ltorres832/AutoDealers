# Instrucciones para Ejecutar AutoDealers Flutter

## 🚀 Ejecución Rápida

### Opción 1: Script Automático (Recomendado)

Desde PowerShell en la raíz del proyecto:

```powershell
.\EJECUTAR_APP.ps1
```

Este script:
1. ✅ Verifica que Flutter esté instalado
2. ✅ Navega al proyecto Flutter
3. ✅ Instala todas las dependencias
4. ✅ Analiza el código
5. ✅ Muestra dispositivos disponibles
6. ✅ Ejecuta la aplicación en Chrome

### Opción 2: Comandos Manuales

```powershell
# 1. Navegar al proyecto Flutter
cd autodealers_flutter

# 2. Instalar dependencias
flutter pub get

# 3. Ver dispositivos disponibles
flutter devices

# 4. Ejecutar en Chrome (Web)
flutter run -d chrome

# O ejecutar en modo release (más rápido)
flutter run -d chrome --release
```

## 📱 Opciones de Ejecución

### Flutter Web (Recomendado para probar)
```powershell
flutter run -d chrome
```

### Android (si tienes emulador/dispositivo)
```powershell
flutter run -d android
```

### iOS (solo en Mac)
```powershell
flutter run -d ios
```

## ⚙️ Requisitos Previos

1. **Flutter instalado**: Verifica con `flutter doctor`
2. **Chrome instalado**: Para ejecutar Flutter Web
3. **Firebase configurado**: Las credenciales ya están en `firebase_config.dart`

## 🔧 Solución de Problemas

### Error: "Flutter no encontrado"
- Instala Flutter desde: https://docs.flutter.dev/get-started/install
- Asegúrate de agregar Flutter al PATH

### Error: "Dependencias no encontradas"
```powershell
cd autodealers_flutter
flutter pub get
flutter clean
flutter pub get
```

### Error: "No se puede conectar a Firebase"
- Verifica que las credenciales en `firebase_config.dart` sean correctas
- Asegúrate de que Firebase esté configurado en tu proyecto

### La aplicación no compila
```powershell
cd autodealers_flutter
flutter clean
flutter pub get
flutter analyze
```

## 📝 Notas Importantes

- La primera ejecución puede tardar varios minutos mientras Flutter compila
- La aplicación se abrirá automáticamente en Chrome
- Presiona `q` en la terminal para detener la aplicación
- Los cambios en el código se reflejan automáticamente con hot reload (presiona `r`)

## 🎯 Primera Vez

1. Ejecuta `.\EJECUTAR_APP.ps1`
2. Espera a que compile (puede tardar 2-5 minutos la primera vez)
3. La aplicación se abrirá automáticamente en Chrome
4. Verás la pantalla de login

## ✅ Estado de la Plataforma

- ✅ **100% de páginas implementadas** (sin placeholders)
- ✅ **Sincronización en tiempo real** con Firestore
- ✅ **Cloud Functions** configuradas y funcionando
- ✅ **Todos los módulos** completos y funcionales
- ✅ **Navegación completa** entre todas las páginas

¡La plataforma está lista para probar! 🎉


