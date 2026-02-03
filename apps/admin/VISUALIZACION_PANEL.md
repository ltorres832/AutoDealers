# Panel Administrativo - Visualización

## 🎨 Diseño del Panel Admin

### Estructura Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    PANEL ADMINISTRATIVO                     │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   SIDEBAR    │           CONTENIDO PRINCIPAL                │
│   (264px)    │                                              │
│              │                                              │
│ ┌──────────┐ │  ┌──────────────────────────────────────┐  │
│ │  LOGO    │ │  │  Vista Global de la Plataforma       │  │
│ │ AutoDeal │ │  │                                      │  │
│ │  [AD]    │ │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │
│ └──────────┘ │  │  │ 50 │ │ 25 │ │100 │ │ 75 │       │  │
│              │  │  │Users│ │Ten.│ │Veh.│ │Leads│       │  │
│ 📊 Vista     │  │  └────┘ └────┘ └────┘ └────┘       │  │
│    Global    │  │                                      │  │
│              │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │
│ 👥 Usuarios  │  │  │ 30 │ │$50K│ │ 15 │ │$5K │       │  │
│              │  │  │Sale│ │Rev │ │Sub │ │Mon │       │  │
│ 🏢 Tenants   │  │  └────┘ └────┘ └────┘ └────┘       │  │
│              │  │                                      │  │
│ 💳 Membresías│  │  Acciones Rápidas:                   │  │
│              │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │
│ 📞 Leads     │  │  │👥  │ │🏢  │ │💳  │ │📋  │       │  │
│              │  │  │User│ │Ten │ │Mem │ │Logs│       │  │
│ 🚗 Vehículos │  │  └────┘ └────┘ └────┘ └────┘       │  │
│              │  └──────────────────────────────────────┘  │
│ 💰 Ventas    │                                              │
│              │                                              │
│ 📢 Campañas  │                                              │
│              │                                              │
│ 🎁 Promos    │                                              │
│              │                                              │
│ 🔗 Integrac. │                                              │
│              │                                              │
│ ⚙️ Config    │                                              │
│              │                                              │
│ 📋 Logs      │                                              │
│              │                                              │
│ ────────────│                                              │
│              │                                              │
│ 👤 Admin     │                                              │
│ admin@...    │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## 🎯 Características Visuales

### Colores Principales
- **Primario**: #2563EB (Azul profesional)
- **Secundario**: #1E40AF (Azul oscuro)
- **Fondo**: #F9FAFB (Gris claro)
- **Texto**: #111827 (Gris oscuro)

### Tipografía
- **Títulos**: Poppins (Bold, Semibold)
- **Cuerpo**: Inter (Regular, Medium)
- **Tamaños**: 
  - H1: 3xl (30px)
  - H2: xl (20px)
  - Body: base (16px)
  - Small: sm (14px)

### Componentes

#### Sidebar
- **Ancho expandido**: 264px (w-64)
- **Ancho colapsado**: 80px (w-20)
- **Fondo**: Blanco (#FFFFFF)
- **Borde**: Gris claro (#E5E7EB)
- **Sombra**: Elegante y sutil

#### Logo
- **Tamaño pequeño**: 40px x 40px
- **Fondo**: Gradiente azul (#2563EB → #1E40AF)
- **Texto**: "AD" en blanco, bold
- **Personalizable**: Carga desde `/api/admin/settings/branding`

#### Navegación
- **Items activos**: Fondo azul claro (#EFF6FF), texto azul (#1D4ED8)
- **Items hover**: Fondo gris claro (#F9FAFB)
- **Indicador**: Punto azul pequeño (2px) a la derecha
- **Iconos**: Emojis de 20px
- **Espaciado**: 4px entre items

#### Cards de Estadísticas
- **Fondo**: Blanco
- **Sombra**: Sutil (shadow-sm)
- **Padding**: 24px (p-6)
- **Bordes**: Redondeados (rounded-lg)
- **Grid**: 4 columnas en desktop, responsive

## 📱 Responsive Design

### Desktop (≥1024px)
- Sidebar siempre visible
- Grid de 4 columnas para stats
- Navegación completa con texto

### Tablet (768px - 1023px)
- Sidebar colapsable
- Grid de 2 columnas para stats
- Navegación con iconos y texto

### Mobile (<768px)
- Sidebar oculto por defecto (hamburger menu)
- Grid de 1 columna para stats
- Navegación solo iconos

## 🚀 Para Ejecutar el Panel

### Opción 1: Con npm (recomendado)
```bash
cd apps/admin
npm install
npm run dev
```

El panel estará disponible en: **http://localhost:3001**

### Opción 2: Con yarn
```bash
cd apps/admin
yarn install
yarn dev
```

### Opción 3: Con pnpm
```bash
cd apps/admin
pnpm install
pnpm dev
```

### Opción 4: Desde la raíz (monorepo)
```bash
npm install
npm run dev
```

## 🔧 Configuración Necesaria

### Variables de Entorno
Crea un archivo `.env.local` en `apps/admin/`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### Firebase Admin SDK
Asegúrate de tener configurado el archivo de credenciales de Firebase Admin en `packages/core/src/firebase.ts`

## 📂 Estructura de Archivos

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Layout principal con sidebar
│   │   │   ├── global/
│   │   │   │   └── page.tsx        # Vista global
│   │   │   ├── users/
│   │   │   ├── tenants/
│   │   │   ├── memberships/
│   │   │   └── settings/
│   │   │       └── branding/
│   │   │           └── page.tsx   # Configuración de logo/favicon
│   │   └── api/
│   ├── components/
│   │   ├── AdminLogo.tsx           # Componente de logo
│   │   └── ...
│   └── lib/
│       └── auth.ts
└── package.json
```

## ✨ Funcionalidades Implementadas

✅ Sidebar profesional con navegación completa
✅ Logo personalizable (admin puede subir su logo)
✅ Favicon personalizable
✅ Diseño responsive
✅ Scrollbars personalizados
✅ Animaciones suaves
✅ Estados activos en navegación
✅ Footer con información del usuario
✅ Vista Global con estadísticas
✅ 12 secciones de administración

## 🎨 Personalización de Branding

Para personalizar el logo y favicon del admin:

1. Ve a `/admin/settings/branding`
2. Sube tu logo (PNG, JPG, SVG - máx 5MB)
3. Sube tu favicon (PNG, ICO, SVG - máx 1MB)
4. Guarda los cambios
5. El logo aparecerá automáticamente en el sidebar

## 📊 Rutas Disponibles

- `/admin/global` - Vista global con estadísticas
- `/admin/users` - Gestión de usuarios
- `/admin/tenants` - Gestión de tenants
- `/admin/memberships` - Gestión de membresías
- `/admin/all-leads` - Todos los leads
- `/admin/all-vehicles` - Todos los vehículos
- `/admin/all-sales` - Todas las ventas
- `/admin/all-campaigns` - Todas las campañas
- `/admin/all-promotions` - Todas las promociones
- `/admin/all-integrations` - Todas las integraciones
- `/admin/settings` - Configuración general
- `/admin/settings/branding` - Branding personalizado
- `/admin/logs` - Logs del sistema





