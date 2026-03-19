# 🚀 GUÍA DE DEPLOYMENT - Flutter Web en Firebase Hosting

## 📋 PREREQUISITOS

1. Firebase CLI instalado
2. Flutter SDK instalado
3. Proyecto Firebase configurado

## 🔧 CONFIGURACIÓN

### 1. Build Flutter Web

```bash
cd autodealers_flutter
flutter build web --release
```

Esto genera los archivos estáticos en `build/web/`

### 2. Configurar Firebase Hosting

Editar `firebase.json` en la raíz del proyecto:

```json
{
  "hosting": [
    {
      "target": "flutter-web",
      "public": "autodealers_flutter/build/web",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css|woff|woff2|ttf|otf|eot)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    }
  ]
}
```

### 3. Deploy

```bash
# Desde la raíz del proyecto
firebase deploy --only hosting:flutter-web
```

## 🌐 CONFIGURACIÓN DE DOMINIO

### Opción 1: Subdominio

```bash
firebase hosting:channel:deploy production
```

### Opción 2: Dominio personalizado

1. Ir a Firebase Console > Hosting
2. Agregar dominio personalizado
3. Seguir las instrucciones de verificación DNS

## 🔄 CI/CD CON GITHUB ACTIONS

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy Flutter Web

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
          
      - name: Install dependencies
        run: |
          cd autodealers_flutter
          flutter pub get
          
      - name: Build web
        run: |
          cd autodealers_flutter
          flutter build web --release
          
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: autodealers-7f62e
```

## 📱 BUILD PARA MOBILE

### Android

```bash
cd autodealers_flutter
flutter build apk --release          # APK
flutter build appbundle --release    # AAB (Google Play)
```

### iOS

```bash
cd autodealers_flutter
flutter build ios --release
```

Luego abrir en Xcode y archivar para App Store.

## ✅ CHECKLIST DE DEPLOYMENT

- [ ] Build Flutter Web completado sin errores
- [ ] Firebase Hosting configurado
- [ ] Variables de entorno configuradas
- [ ] Cloud Functions deployadas
- [ ] Dominio configurado (si aplica)
- [ ] SSL/HTTPS activado
- [ ] Pruebas en producción realizadas
- [ ] Monitoreo configurado

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Firebase not initialized"
- Verificar que `firebase.json` esté configurado correctamente
- Verificar que el proyecto Firebase esté vinculado

### Error: "Build failed"
- Verificar que todas las dependencias estén instaladas
- Ejecutar `flutter clean` y rebuild

### Error: "404 Not Found"
- Verificar que `rewrites` esté configurado en `firebase.json`
- Verificar que `index.html` exista en `build/web/`

---

**Última actualización:** Guía de deployment creada


