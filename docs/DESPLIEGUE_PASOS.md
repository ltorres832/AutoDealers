# Cómo desplegar: Cloud Functions y Flutter en producción

Guía paso a paso para las dos acciones que debes hacer tú.

---

## ¿Por qué solo Advertiser y Admin en los --dart-define?

En Flutter **solo hay dos URLs de backend** configuradas en código:

| Variable | Para qué se usa |
|----------|------------------|
| `ADVERTISER_API_BASE_URL` | Cuando el usuario es **anunciante**: crear anuncios, facturación. Flutter llama a la app Next.js **Advertiser**. |
| `ADMIN_API_BASE_URL` | Cuando el usuario es **admin**: crear usuario, tenant o membresía desde Flutter. Flutter llama a la app Next.js **Admin** por REST. |

**Dealer, Seller y Público** no tienen URL propia en Flutter porque:

- La app Flutter **es** la interfaz de dealer, seller y público: un solo build, el usuario inicia sesión y según su rol ve dealer, seller o público.
- Esas pantallas usan **Firebase** (Auth, Firestore, Cloud Functions), no llaman a una URL tipo `https://dealer.tudominio.com`. Firebase se configura una vez en el proyecto (Firebase options / `google-services`), no con `--dart-define`.

Las otras apps del monorepo (dealer, seller, public-web en Next.js) son para **web Next.js**. Si en el futuro quieres que Flutter llame a alguna por HTTP, ahí sí se añadiría otra URL en `api_config.dart` y otro `--dart-define`. Hoy no hace falta.

---

## Parte 1: Desplegar Cloud Functions en Firebase

Esto hace que la función `updateMembership` (y en el futuro multi-dealer) esté disponible en tu proyecto Firebase.

### Requisitos

- Node.js 20 (o la versión indicada en `functions/package.json` → `engines.node`).
- Firebase CLI instalado y **logueado** en tu proyecto:
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase use <tu-project-id>   # si tienes varios proyectos
  ```

### Pasos

1. **Abrir terminal en la raíz del monorepo** (donde está `firebase.json` y la carpeta `functions`).

2. **Entrar en la carpeta de functions e instalar dependencias** (si aún no lo has hecho):
   ```bash
   cd functions
   npm install
   ```

3. **Compilar TypeScript** (el proyecto usa `predeploy` que puede hacerlo; por si acaso):
   ```bash
   npm run build
   ```

4. **Desplegar solo las Cloud Functions**:
   ```bash
   npm run deploy
   ```
   Esto ejecuta `firebase deploy --only functions`. La primera vez puede pedirte que actives el plan Blaze si es necesario.

5. **Comprobar**: En la [consola de Firebase](https://console.firebase.google.com) → tu proyecto → **Functions**. Deberías ver `updateMembership` (y el resto de funciones que exporte `functions`).

### Si algo falla

- **Error de permisos / plan**: Firebase Functions en producción suelen requerir plan Blaze (pago por uso).
- **Error de build**: Revisa que en la raíz del monorepo estén bien instalados los paquetes que usa `functions` (por ejemplo `@autodealers/billing`, `@autodealers/core` si son locales).
- **`firebase deploy` no encuentra el proyecto**: Ejecuta `firebase use <project-id>` desde la raíz del repo.

---

## Parte 2: Compilar Flutter para producción con las URLs correctas

Así la app Flutter (web o Android/iOS) usa en producción las URLs de tus backends y los números de contacto reales.

### Sustituye por tus valores reales

- **URL del backend Advertiser** (app Next.js de anunciantes):  
  Ejemplo: `https://advertiser.tudominio.com`
- **URL del backend Admin** (app Next.js de administración):  
  Ejemplo: `https://admin.tudominio.com`
- **Teléfono de contacto** (solo dígitos con código de país):  
  Ejemplo: `34600000000`
- **WhatsApp** (mismo formato):  
  Ejemplo: `34600000000`

### Flutter Web (para hosting estático: Vercel, etc.)

Desde la raíz del repo, entra en la carpeta Flutter y ejecuta:

```bash
cd autodealers_flutter

flutter pub get
flutter build web ^
  --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.tudominio.com ^
  --dart-define=ADMIN_API_BASE_URL=https://admin.tudominio.com ^
  --dart-define=CONTACT_PHONE=34600000000 ^
  --dart-define=CONTACT_WHATSAPP=34600000000
```

En **Linux/macOS** usa `\` en lugar de `^` para continuar la línea:

```bash
flutter build web \
  --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.tudominio.com \
  --dart-define=ADMIN_API_BASE_URL=https://admin.tudominio.com \
  --dart-define=CONTACT_PHONE=34600000000 \
  --dart-define=CONTACT_WHATSAPP=34600000000
```

La salida estará en `autodealers_flutter/build/web`. Sube ese contenido al hosting que uses (Vercel, Netlify, etc.).

### Flutter Android (APK / App Bundle)

```bash
cd autodealers_flutter

flutter build apk ^
  --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.tudominio.com ^
  --dart-define=ADMIN_API_BASE_URL=https://admin.tudominio.com ^
  --dart-define=CONTACT_PHONE=34600000000 ^
  --dart-define=CONTACT_WHATSAPP=34600000000
```

Para AAB (Play Store):

```bash
flutter build appbundle ^
  --dart-define=ADVERTISER_API_BASE_URL=https://... ^
  --dart-define=ADMIN_API_BASE_URL=https://... ^
  --dart-define=CONTACT_PHONE=34600000000 ^
  --dart-define=CONTACT_WHATSAPP=34600000000
```

### Si aún no tienes URL propia (o no usas alguna)

- **No hace falta poner ninguna URL** hasta que tengas dominio/hosting. Sin `--dart-define`, Flutter usa los valores por defecto:
  - Advertiser: `http://localhost:3001`
  - Admin: `http://localhost:3000`
  - Contacto: `1234567890`
- Puedes compilar y desplegar así:
  ```bash
  flutter build web
  ```
  Cuando más adelante tengas las URLs, vuelves a hacer el build con los `--dart-define` y redespliegas.

Otras opciones:

- Si **no** usas la app Advertiser desde Flutter, puedes omitir `ADVERTISER_API_BASE_URL`.
- Si **no** usas crear usuario/tenant/membresía desde Flutter Admin, puedes omitir `ADMIN_API_BASE_URL`.
- Si no quieres configurar teléfono/WhatsApp aún, puedes omitir `CONTACT_PHONE` y `CONTACT_WHATSAPP`.

Puedes usar solo los `--dart-define` que necesites, por ejemplo:

```bash
flutter build web --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.ejemplo.com
```

---

## Resumen rápido

| Qué quieres | Dónde | Comando |
|-------------|--------|---------|
| Desplegar Cloud Functions (`updateMembership`, etc.) | Raíz del repo | `cd functions && npm install && npm run deploy` |
| Build Flutter web con todas las URLs/contactos | En `autodealers_flutter` | `flutter build web --dart-define=ADVERTISER_API_BASE_URL=... --dart-define=ADMIN_API_BASE_URL=... --dart-define=CONTACT_PHONE=... --dart-define=CONTACT_WHATSAPP=...` |

**Nota:** Firebase Hosting y App Hosting se eliminaron de este proyecto. Para publicar la web Flutter usa Vercel u otro hosting (`deploy:*:vercel` en `package.json`).

Si sigues estos pasos, las “acciones que siguen siendo tuyas” quedan cubiertas.


