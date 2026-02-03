# Guía de Inicio Rápido

## Prerrequisitos

- Node.js 18+ instalado
- npm 9+ o yarn
- Cuenta de Firebase configurada
- Cuenta de Stripe (para desarrollo usar modo test)

## Instalación

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales.

### 3. Configurar Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilita Authentication (Email/Password)
3. Crea una base de datos Firestore
4. Habilita Storage
5. Genera una Service Account Key y copia las credenciales a `.env`

### 4. Configurar Firestore Rules

Copia las reglas de seguridad desde `firestore.rules` (crear si no existe) y despliega:

```bash
firebase deploy --only firestore:rules
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

## Estructura del Proyecto

```
AutoDealers/
├── apps/              # Aplicaciones (admin, dealer, seller, public-web)
├── packages/          # Módulos compartidos
│   ├── core/         # Autenticación, usuarios, tenants
│   ├── crm/          # CRM central
│   ├── messaging/    # Mensajería omnicanal
│   ├── inventory/    # Inventario
│   ├── ai/           # IA
│   ├── billing/      # Stripe
│   └── shared/       # Utilidades
├── docs/             # Documentación
└── scripts/          # Scripts de utilidad
```

## Primeros Pasos

### Crear un usuario administrador

1. Ejecuta el script de inicialización (crear):
```bash
npm run init:admin
```

2. O manualmente desde Firebase Console:
   - Ve a Authentication
   - Crea un usuario con email/password
   - Asigna el claim `role: 'admin'` manualmente

### Acceder al panel admin

1. Inicia sesión con el usuario administrador
2. Navega a `/admin`
3. Crea tu primera membresía
4. Crea tu primer dealer o vendedor

## Desarrollo por Fases

### Fase 1: Core + CRM + Web + Billing

Enfócate en:
- Autenticación funcionando
- CRM básico
- Inventario
- Webs públicas
- Stripe integrado

### Fase 2: Mensajería + Citas

Agrega:
- WhatsApp
- Facebook Messenger
- Sistema de citas
- Recordatorios

### Fase 3: IA + Social

Completa con:
- IA avanzada
- Publicaciones sociales
- Marketplace

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia todos los servicios en desarrollo
npm run build            # Build de producción
npm run lint             # Linter

# Módulos específicos
npm run dev --workspace=@autodealers/core
npm run build --workspace=@autodealers/crm

# Limpiar
npm run clean            # Limpia todos los builds
```

## Troubleshooting

### Error de autenticación Firebase
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que el Service Account tenga los permisos necesarios

### Error de Stripe
- Verifica que estés usando las keys de test en desarrollo
- Revisa los webhooks en Stripe Dashboard

### Error de módulos
- Ejecuta `npm install` nuevamente
- Verifica que todos los workspaces estén correctamente configurados

## Recursos

- [Documento Maestro](./DOCUMENTO_MAESTRO.md)
- [Arquitectura](./ARQUITECTURA.md)
- [Modelos de Datos](./MODELOS_DATOS.md)
- [Roadmap](./ROADMAP.md)
- [Integraciones](./INTEGRACIONES.md)





