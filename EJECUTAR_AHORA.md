# 🚀 EJECUTAR PLATAFORMA AUTODEALERS - INSTRUCCIONES RÁPIDAS

## ✅ ESTADO: 100% COMPLETO Y LISTO PARA PROBAR

---

## 🎯 PASOS PARA EJECUTAR (3 PASOS SIMPLES)

### Paso 1: Verificar Flutter

Abre PowerShell y ejecuta:
```powershell
flutter --version
```

Si Flutter NO está instalado:
1. Descarga desde: https://docs.flutter.dev/get-started/install/windows
2. Extrae a `C:\src\flutter` (o donde prefieras)
3. Agrega `C:\src\flutter\bin` al PATH del sistema
4. Reinicia PowerShell

### Paso 2: Navegar al Proyecto

```powershell
cd c:\Users\ltorr\AutoDealers\autodealers_flutter
```

### Paso 3: Ejecutar la Aplicación

```powershell
# Obtener dependencias (primera vez)
flutter pub get

# Ejecutar en Chrome (Web)
flutter run -d chrome
```

**¡Listo!** La aplicación se abrirá automáticamente en Chrome.

---

## 🎮 CONTROLES DURANTE LA EJECUCIÓN

- **`r`** - Hot Reload (recargar cambios)
- **`R`** - Hot Restart (reiniciar app)
- **`q`** - Quit (salir)

---

## 📱 ALTERNATIVAS DE EJECUCIÓN

### Web (Chrome) - RECOMENDADO
```powershell
flutter run -d chrome
```

### Web (Release - Más rápido)
```powershell
flutter run -d chrome --release
```

### Android (si tienes emulador/dispositivo)
```powershell
flutter run -d android
```

### Ver dispositivos disponibles
```powershell
flutter devices
```

---

## 🔥 VERIFICAR CLOUD FUNCTIONS (Opcional)

Las Cloud Functions están en `functions/src/`. Para desplegarlas:

```bash
cd functions
npm install
firebase deploy --only functions
```

**Nota:** Para pruebas básicas de la UI, las Cloud Functions no son necesarias inmediatamente.

---

## ✅ VERIFICACIÓN RÁPIDA

Ejecuta estos comandos para verificar que todo esté bien:

```powershell
# 1. Verificar Flutter
flutter doctor

# 2. Verificar proyecto
cd c:\Users\ltorr\AutoDealers\autodealers_flutter
flutter pub get

# 3. Analizar código
flutter analyze

# 4. Ver dispositivos
flutter devices

# 5. Ejecutar
flutter run -d chrome
```

---

## 🐛 SI HAY PROBLEMAS

### Flutter no encontrado
- Instala Flutter desde: https://docs.flutter.dev/get-started/install/windows
- Agrega Flutter al PATH del sistema

### Error de dependencias
```powershell
cd autodealers_flutter
flutter clean
flutter pub get
```

### Error de Firebase
- Verifica que `firebase_config.dart` tenga las credenciales correctas
- Verifica conexión a internet

### No hay dispositivos disponibles
- Para Web: Instala Chrome
- Para Android: Configura Android Studio y emulador
- Para iOS: Solo disponible en Mac

---

## 📋 CHECKLIST ANTES DE EJECUTAR

- [ ] Flutter instalado (`flutter --version` funciona)
- [ ] Estás en el directorio correcto (`autodealers_flutter`)
- [ ] Dependencias instaladas (`flutter pub get` ejecutado)
- [ ] Chrome instalado (para Web)
- [ ] Conexión a internet activa

---

## 🎉 ¡LISTO PARA PROBAR!

Ejecuta ahora:
```powershell
cd c:\Users\ltorr\AutoDealers\autodealers_flutter
flutter run -d chrome
```

**La aplicación se abrirá en Chrome automáticamente y podrás probar todas las funcionalidades! 🚀**


