# 🚀 Cómo Probar las Apps Individualmente

## 📱 Estructura de las Apps

La plataforma AutoDealers Flutter es una **sola aplicación** que muestra diferentes dashboards según el **rol del usuario** que inicia sesión:

1. **Admin App** - Panel de administración
2. **Dealer App** - Dashboard del concesionario
3. **Seller App** - Dashboard del vendedor
4. **Advertiser App** - Dashboard del anunciante
5. **Public-Web App** - Sitio web público (no requiere login)

## 🎯 Método 1: Probar con Usuarios Diferentes

### Paso 1: Crear Usuarios de Prueba

Ejecuta el script para crear usuarios:

```powershell
cd functions
node crear-usuarios-directo.js
```

O crea los usuarios manualmente en Firebase Console:
- https://console.firebase.google.com/project/autodealers-7f62e/authentication/users

**Usuarios de prueba:**
- `admin@autodealers.test` / `Admin123!` → **Admin App**
- `dealer@autodealers.test` / `Dealer123!` → **Dealer App**
- `seller@autodealers.test` / `Seller123!` → **Seller App**
- `advertiser@autodealers.test` / `Advertiser123!` → **Advertiser App**

### Paso 2: Ejecutar la App Flutter

```powershell
cd autodealers_flutter
flutter run -d chrome
```

### Paso 3: Iniciar Sesión con Cada Usuario

1. **Admin App:**
   - Email: `admin@autodealers.test`
   - Password: `Admin123!`
   - Se redirige automáticamente a `/admin/dashboard`

2. **Dealer App:**
   - Email: `dealer@autodealers.test`
   - Password: `Dealer123!`
   - Se redirige automáticamente a `/dealer/dashboard`

3. **Seller App:**
   - Email: `seller@autodealers.test`
   - Password: `Seller123!`
   - Se redirige automáticamente a `/seller/dashboard`

4. **Advertiser App:**
   - Email: `advertiser@autodealers.test`
   - Password: `Advertiser123!`
   - Se redirige automáticamente a `/advertiser/dashboard`

5. **Public-Web App:**
   - No requiere login
   - Accede directamente a la URL pública o navega a `/public`

## 🎯 Método 2: Probar con Modo Desarrollo (Hot Reload)

### Ejecutar en modo desarrollo:

```powershell
cd autodealers_flutter
flutter run -d chrome --hot
```

Esto permite:
- Cambios en tiempo real (Hot Reload)
- Ver logs en la consola
- Depurar fácilmente

### Cambiar entre usuarios:

1. Cierra sesión (botón de logout)
2. Inicia sesión con otro usuario
3. La app se actualiza automáticamente al dashboard correspondiente

## 🎯 Método 3: Probar Build de Producción

### Compilar para producción:

```powershell
cd autodealers_flutter
flutter build web --release
```

### Servir localmente:

```powershell
cd build/web
python -m http.server 8000
# O con Node.js:
npx http-server -p 8000
```

Luego abre: `http://localhost:8000`

## 📋 Checklist de Pruebas por App

### ✅ Admin App (`/admin/*`)

- [ ] Dashboard con estadísticas globales
- [ ] Gestión de usuarios
- [ ] Gestión de tenants
- [ ] Gestión de sellers
- [ ] Configuración de membresías
- [ ] Configuración de precios
- [ ] Configuración de IA
- [ ] Feature flags
- [ ] Modo mantenimiento
- [ ] Reportes avanzados

### ✅ Dealer App (`/dealer/*`)

- [ ] Dashboard con métricas del dealer
- [ ] Gestión de inventario
- [ ] CRM (Leads)
- [ ] Mensajería
- [ ] Citas
- [ ] Ventas
- [ ] Reportes
- [ ] Campañas
- [ ] Vendedores asignados
- [ ] Configuración

### ✅ Seller App (`/seller/*`)

- [ ] Dashboard con métricas del seller
- [ ] Leads asignados
- [ ] Inventario disponible
- [ ] Mensajería
- [ ] Citas
- [ ] Ventas propias
- [ ] Reportes de desempeño
- [ ] Campañas

### ✅ Advertiser App (`/advertiser/*`)

- [ ] Dashboard de anuncios
- [ ] Crear anuncios
- [ ] Ver estadísticas de anuncios
- [ ] Gestión de pagos
- [ ] Métodos de pago
- [ ] Facturación

### ✅ Public-Web App (`/public/*`)

- [ ] Página de inicio
- [ ] Catálogo de vehículos
- [ ] Búsqueda de vehículos
- [ ] Detalles de vehículo
- [ ] Formulario de contacto
- [ ] Registro de usuarios
- [ ] Chat público (si está habilitado)

## 🔧 Comandos Útiles

### Ver logs en tiempo real:

```powershell
flutter run -d chrome --verbose
```

### Limpiar y recompilar:

```powershell
flutter clean
flutter pub get
flutter build web --release
```

### Ver dispositivos disponibles:

```powershell
flutter devices
```

### Ejecutar en modo debug:

```powershell
flutter run -d chrome --debug
```

## 🐛 Solución de Problemas

### Si no puedes iniciar sesión:

1. Verifica que los usuarios existan en Firebase Auth
2. Verifica que los documentos en Firestore `users` tengan el campo `role` correcto
3. Revisa la consola del navegador para errores

### Si no se redirige al dashboard correcto:

1. Verifica el campo `role` en el documento del usuario en Firestore
2. Revisa `app_router.dart` para las rutas correctas
3. Verifica los guards de autenticación

### Si la app no carga:

1. Verifica la configuración de Firebase en `firebase_config.dart`
2. Verifica que las Cloud Functions estén desplegadas
3. Revisa la consola del navegador para errores de red

## 📝 Notas

- Todas las apps comparten el mismo código base
- La diferencia está en las rutas y permisos según el rol
- Los datos se filtran automáticamente según el `tenantId` y `role` del usuario
- El Public-Web no requiere autenticación


