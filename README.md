# AutoDealers - Plataforma SaaS para Dealers y Vendedores

Plataforma SaaS multi-tenant diseñada para dealers de autos y vendedores individuales, con CRM centralizado, automatización con IA, y gestión completa de inventario, leads, citas y ventas.

## 🏗️ Arquitectura

### 🌐 Web Apps (Next.js/React)
**Todas estas son aplicaciones web que se ejecutan en el navegador:**

- **Admin Panel** - Panel administrativo web
- **Dealer Dashboard** - Dashboard web para dealers
- **Seller Dashboard** - Dashboard web para vendedores  
- **Public Web** - Webs públicas dinámicas

**Stack:**
- **Framework:** Next.js 14+ (App Router)
- **UI:** React 18+ / TypeScript
- **Styling:** Tailwind CSS
- **Estado:** Zustand / React Query
- **Acceso:** Navegador web (responsive)

### 📱 Mobile App (Flutter)
**App móvil nativa (NO es web app):**

- **Framework:** Flutter
- **Plataformas:** iOS y Android
- **Estado:** Provider / Riverpod
- **Navegación:** GoRouter
- **Instalación:** App Store / Google Play

### ⚙️ Backend (Node.js/Next.js API)
**Servidor que alimenta las web apps y mobile app:**

- **API:** Node.js / Next.js API Routes
- **Base de Datos:** Firebase (Firestore)
- **Autenticación:** Firebase Auth
- **Storage:** Firebase Storage
- **Pagos:** Stripe
- **Integraciones:** Meta APIs, WhatsApp Business API
- **IA:** OpenAI / Anthropic

## 📁 Estructura del Proyecto

```
AutoDealers/
├── apps/
│   ├── admin/          # Next.js - Panel Administrativo Web
│   ├── dealer/         # Next.js - Dashboard Dealer Web
│   ├── seller/         # Next.js - Dashboard Seller Web
│   ├── public-web/     # Next.js - Webs públicas dinámicas
│   └── mobile/         # Flutter - App Móvil (iOS/Android)
├── packages/
│   ├── core/           # Lógica de negocio compartida (TypeScript)
│   ├── crm/            # Módulo CRM central
│   ├── messaging/      # Mensajería omnicanal
│   ├── inventory/      # Gestión de inventario
│   ├── ai/             # Integración con IA
│   ├── billing/        # Stripe y facturación
│   └── shared/         # Utilidades compartidas
├── docs/               # Documentación completa
└── scripts/            # Scripts de utilidad
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Flutter 3.0+ (para app móvil)
- Firebase project configurado
- Cuentas de servicios externos (Stripe, Meta, etc.)

### Instalación

```bash
# Instalar dependencias del monorepo
npm install

# Instalar dependencias de Flutter
cd apps/mobile
flutter pub get
```

### Configuración

1. Copiar `.env.example` a `.env` y completar variables
2. Configurar Firebase (ver `docs/INICIO_RAPIDO.md`)
3. Crear usuario administrador:
   ```bash
   node scripts/init-admin.js
   ```

### Desarrollo

```bash
# Desarrollo web (todos los apps)
npm run dev

# Desarrollo móvil
cd apps/mobile
flutter run
```

### Build y deploy (solo Firebase, sin coste adicional)

Deploy usando **solo Firebase Hosting** (sin Cloud Run ni Vercel):

```bash
npm run deploy:firebase
```

(Ejecuta build de todas las apps, `prepare-hosting` y `firebase deploy --only hosting`.)

- **Hosting en vivo:** [autodealers-7f62e.web.app](https://autodealers-7f62e.web.app), [autodealers-admin.web.app](https://autodealers-admin.web.app), [autodealers-seller.web.app](https://autodealers-seller.web.app), etc.
- Detalles y desplegar un solo sitio: [docs/DEPLOY_FIREBASE.md](./docs/DEPLOY_FIREBASE.md).

## 📚 Documentación

- [Documento Maestro](./docs/DOCUMENTO_MAESTRO.md) - Especificación completa
- [Arquitectura](./docs/ARQUITECTURA.md) - Arquitectura técnica
- [Arquitectura de Tecnologías](./docs/ARQUITECTURA_TECNOLOGIAS.md) - Stack tecnológico
- [Modelos de Datos](./docs/MODELOS_DATOS.md) - Esquemas de base de datos
- [API](./docs/API.md) - Documentación de APIs
- [Roadmap](./docs/ROADMAP.md) - Plan de desarrollo por fases
- [Integraciones](./docs/INTEGRACIONES.md) - Guía de integraciones
- [Deployment](./docs/DEPLOYMENT.md) - Guía de despliegue
- [Seguridad](./docs/SECURITY.md) - Mejores prácticas de seguridad
- [Testing](./docs/TESTING.md) - Guía de testing

## 🔐 Roles del Sistema

- **Administrador:** Control total de la plataforma
- **Dealer:** Gestión de inventario y vendedores
- **Vendedor:** CRM y gestión de leads individual

## 🌐 Aplicaciones

### Web
- **Admin:** `http://localhost:3001` - Panel administrativo
- **Dealer:** `http://localhost:3002` - Dashboard dealer
- **Seller:** `http://localhost:3003` - Dashboard vendedor
- **Public Web:** `http://localhost:3000` - Webs públicas

### Móvil
- **iOS/Android:** App Flutter con todas las funcionalidades

## 🛠️ Comandos

```bash
# Desarrollo
npm run dev              # Inicia todos los servicios web
npm run build            # Build de producción
npm run lint             # Linter

# Flutter
cd apps/mobile
flutter run              # Ejecutar app
flutter build ios        # Build iOS
flutter build apk         # Build Android
```

## 📝 Licencia

MIT License - Ver [LICENSE](./LICENSE)

## 🤝 Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guía de contribución.
