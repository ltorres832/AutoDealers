# Flutter – Qué falta / Qué sigue (actualizado)

## ✅ Hecho en esta pasada

- **Dealer/Seller:** Rutas anidadas (leads/create, :id, :id/edit, inventory igual), menú lateral (drawers) en todas las páginas, botón Editar desde detalle usa `/dealer/...` o `/seller/...` según path.
- **Admin:** Usuarios cargan en initState; tenants idem; detalle tenant carga con loadTenant y muestra resumen; membresías cargan en initState; editar membresía (nombre, precio, activa) con load/save; reportes con selector de tenant y fechas; Cloud Function `updateMembership` añadida en `functions`.
- **Advertiser:** Listado de anuncios (API + token Firebase), pausar/reanudar; facturación: métodos de pago (listar, añadir vía Stripe URL, predeterminado, eliminar). Config URL base con `--dart-define=ADVERTISER_API_BASE_URL`.
- **Tiempo real:** Dashboard Dealer/Seller actualiza cada 30 s con `Timer.periodic`.
- **Verificación:** Doc `FLUTTER_VERIFICACION_NOTAS.md` (URL Advertiser, Bearer token, updateMembership).

---

## ❌ Falta o sigue pendiente

### 1. Advertiser – Rutas y páginas que no existen

| Ruta Flutter | Estado | Acción |
|--------------|--------|--------|
| `/advertiser/ads/create` | No definida en router | Añadir GoRoute y página "Crear anuncio" (formulario + llamada API POST /api/advertiser/ads) o redirigir a listado por ahora |
| `/advertiser/ads/:id` | No definida | Añadir detalle de anuncio (opcional) |

El botón "Crear anuncio" en `AdvertiserAdsPage` hace `context.push('/advertiser/ads/create')` → actualmente dará error de ruta.

### 2. Admin – Rutas con TODO (misma página o placeholder)

Muchas rutas de crear/editar/detalle en Admin apuntan a la misma list page o a páginas genéricas:

- `/admin/users/create` → AdminUsersPage (TODO: Create user page)
- `/admin/tenants/create` → AdminTenantsPage (TODO: Create tenant page)
- `/admin/tenants/:id/edit` → AdminTenantDetailPage (TODO: Edit tenant page)
- `/admin/memberships/create` → AdminMembershipsPage (TODO: Create membership page)
- `/admin/tasks/create`, `/admin/tasks/:id` → AdminTasksPage
- `/admin/workflows/create`, `/admin/workflows/:id` → AdminWorkflowsPage
- Y otros: campaigns, promotions, banners, testimonials, FAQs, corporate-emails, announcements, policies, email-aliases, scoring, advertisers, sponsored-content, contract-templates, sellers.

**Sigue:** Implementar las páginas reales de crear/editar/detalle donde Next.js las tenga, o dejar el enlace a la lista hasta tenerlas.

### 3. TODOs en código (funcionalidad concreta)

| Archivo | TODO | Prioridad |
|---------|------|-----------|
| `lead_detail_page.dart` | Agregar interacción | Media |
| `internal_chat_page.dart` (seller) | Navegar a conversación individual | Media |
| `public_chat_page.dart` (seller) | Navegar a conversación | Media |
| `dealers_page.dart` (dealer) | Solicitar asociación con otro dealer | Baja |
| `fi_workflows_page.dart` | Activar/desactivar y editar workflow | Media |
| `campaigns_page.dart` (dealer) | Pausar campaña | Media |
| `vehicles_catalog_section.dart` | Contacto directo desde tarjeta | Baja |
| `public_navbar.dart` | Drawer móvil | Baja |
| `featured_dealers_section.dart` | Navegar a perfil del dealer | Baja |
| `contact_section.dart` | WhatsApp/tel número real | Baja |
| `vehicle_categories_section.dart` | Navegar a categoría | Baja |
| `ai_provider.dart` | Sugerir vehículos / optimizar precio (Cloud Function) | Baja |
| `contract_templates_page.dart` (admin) | Eliminación de plantilla | Baja |
| `multi_dealer_requests_page.dart` | Cargar solicitudes (Cloud Function) | Media |

### 4. App pública – Rutas Next.js sin equivalente Flutter

- `/caracteristicas`, `/sobre-nosotros`, `/advertise` → En Flutter se añadieron placeholders estáticos; revisar contenido.
- `/review/submit`, `/review/rating/[token]`, `/fi/documents/[token]`, `/survey/[token]`, `/upload-documents/[token]`, `/contracts/sign/[token]`, `/[subdomain]/reviews`, etc. → No implementados en Flutter.

### 5. Despliegue y configuración (acción tuya)

- **Cloud Functions:** Desplegar para que `updateMembership` exista en Firebase: `firebase deploy --only functions` (o el comando que uses).
- **Advertiser producción:** Al buildear Flutter, pasar `--dart-define=ADVERTISER_API_BASE_URL=https://...`.

---

## Orden sugerido para “qué sigue”

1. **Advertiser:** Añadir ruta `/advertiser/ads/create` (y opcionalmente `/advertiser/ads/:id`) para que el botón "Crear anuncio" no rompa; si no quieres formulario completo aún, que la ruta muestre un placeholder o redirija a `/advertiser/ads`.
2. **Admin:** Ir rellenando los TODOs de crear/editar (empezar por users, tenants, memberships si son críticos).
3. **TODOs de navegación:** Chat (navegar a conversación), lead (agregar interacción), workflows/campaigns (acciones).
4. **Público:** Perfil dealer dedicado, rutas por token (review, FI, contrato) si las necesitas en Flutter.

Si indicas por qué bloque quieres seguir (Advertiser create ad, Admin create user, o TODOs de dealer/seller), se puede bajar a cambios concretos en código.


