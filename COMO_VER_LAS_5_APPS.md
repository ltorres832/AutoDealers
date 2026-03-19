# 🚀 Cómo Ver las 5 Apps de AutoDealers

## Las 5 Aplicaciones

1. **Admin** - Panel de administración global
2. **Dealer** - Panel para concesionarios
3. **Seller** - Panel para vendedores
4. **Advertiser** - Panel para anunciantes
5. **Public-Web** - Sitio web público

## 📱 Cómo Ejecutar y Verlas

### Opción 1: Ejecutar Flutter Web (Recomendado)

```powershell
cd autodealers_flutter
flutter run -d chrome
```

La aplicación se abrirá en Chrome y podrás:
- **Iniciar sesión** con diferentes roles para ver cada app
- **Cambiar de rol** desde el menú de usuario
- **Navegar** entre las diferentes secciones según tu rol

### Opción 2: Ejecutar con Modo Debug

```powershell
cd autodealers_flutter
flutter run -d chrome --debug
```

### Opción 3: Build para Producción

```powershell
cd autodealers_flutter
flutter build web --release
```

Luego servir los archivos desde `build/web/`

## 🔐 Roles y Acceso a las Apps

### Admin App
- **Rol requerido:** `admin`
- **Rutas:** `/admin/*`
- **Funcionalidades:** Gestión global, usuarios, tenants, configuraciones

### Dealer App
- **Rol requerido:** `dealer`, `masterDealer`, `dealerAdmin`
- **Rutas:** `/dealer/*`
- **Funcionalidades:** Gestión de inventario, leads, ventas, vendedores

### Seller App
- **Rol requerido:** `seller`
- **Rutas:** `/seller/*`
- **Funcionalidades:** Leads asignados, ventas, citas, mensajes

### Advertiser App
- **Rol requerido:** `advertiser`
- **Rutas:** `/advertiser/*`
- **Funcionalidades:** Gestión de anuncios, facturación

### Public-Web App
- **Rol requerido:** Ninguno (público)
- **Rutas:** `/public/*`, `/`
- **Funcionalidades:** Catálogo de vehículos, contacto, información

## 🎯 Cómo Probar Cada App

### 1. Crear Usuarios de Prueba

Necesitas crear usuarios en Firestore con diferentes roles:

```javascript
// Admin
{
  email: "admin@test.com",
  role: "admin",
  // ...
}

// Dealer
{
  email: "dealer@test.com",
  role: "dealer",
  tenantId: "tenant-id",
  // ...
}

// Seller
{
  email: "seller@test.com",
  role: "seller",
  tenantId: "tenant-id",
  // ...
}

// Advertiser
{
  email: "advertiser@test.com",
  role: "advertiser",
  // ...
}
```

### 2. Iniciar Sesión

1. Ejecuta `flutter run -d chrome`
2. Ve a la pantalla de login
3. Inicia sesión con el usuario correspondiente
4. Serás redirigido automáticamente al dashboard según tu rol

### 3. Cambiar Entre Apps

Si tienes múltiples roles, puedes:
- Cerrar sesión y volver a iniciar con otro usuario
- O usar el selector de tenant/rol si está implementado

## 🔧 Configuración de Rutas

Las rutas están definidas en:
- `lib/core/presentation/routing/app_router.dart`

Cada app tiene sus propias rutas:
- Admin: `/admin/*`
- Dealer: `/dealer/*`
- Seller: `/seller/*`
- Advertiser: `/advertiser/*`
- Public: `/public/*` o `/`

## 📝 Notas Importantes

- **Primera ejecución:** Puede tardar 2-5 minutos en compilar
- **Hot Reload:** Presiona `r` en la terminal para recargar cambios
- **Hot Restart:** Presiona `R` para reiniciar completamente
- **Detener:** Presiona `q` para salir

## 🐛 Si Hay Errores

Si encuentras errores de compilación:
1. Ejecuta `flutter clean`
2. Ejecuta `flutter pub get`
3. Ejecuta `flutter run -d chrome` de nuevo

## ✅ Estado Actual

- ✅ **Estructura de las 5 apps** creada
- ✅ **Rutas configuradas** para cada app
- ✅ **Providers y repositorios** implementados
- ⚠️ **Algunos errores de compilación** pendientes de corregir

Una vez corregidos los errores, podrás ver todas las apps funcionando correctamente.


