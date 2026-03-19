# Flutter vs Next.js – Qué está listo y qué falta

**Respuesta directa:** No. Las 5 apps no están al 100% igual que Next.js. Rutas y estructura sí están alineadas; lo que falta es verificar cada botón, cada pantalla con datos reales y algunos flujos/features que en Next.js existen y en Flutter no (o no están probados).

---

## Lo que SÍ está hecho / alineado

### App pública
- Navbar y footer: enlaces a home, catálogo, promociones, dealers, contacto, login, FAQ, precios, términos, privacidad, tel/email.
- Home: hero, búsqueda, categorías, vehículos destacados, promos, dealers, contacto, formulario.
- Catálogo: filtros, búsqueda, filtro por dealer.
- Detalle vehículo: Firestore por `vehicleId` + `tenantId`, galería, specs, WhatsApp, “Enviar consulta”.
- Contacto: formulario que guarda en Firestore `public_contacts`.
- Páginas estáticas: `/privacidad`, `/terminos`, `/faq`, `/precios`.
- Página dealers: lista de dealers y “Ver perfil” → catálogo por dealer.
- “Crear Anuncio” / “Crear Anuncio Ahora” → `/registro`.
- **Tiempo real (público):** promos, dealers, banners y contenido patrocinado usan `snapshots()`; inventario público usa stream donde está `watchVehicles`.

### Dealer
- Dashboard con números reales desde Firestore (leads, vehículos, ventas, mensajes, citas hoy) y navegación a cada sección.
- Rutas: todas las del checklist (leads, kanban, inventory, messages, appointments, etc.).
- Leads e inventario: usan `tenantId` (user o `getCurrentTenantId`) y cargan datos.
- **Tiempo real:** CRM e inventario usan `watchLeads` / `watchVehicles` (streams); otros repos (mensajes, citas, ventas, etc.) también exponen `.snapshots()` donde se usan.

### Seller
- Dashboard con stats reales y enlaces a leads, ventas, citas, mensajes.
- Misma estructura de rutas; leads/inventario con fallback de `tenantId`.

### Admin
- Rutas y páginas existen para usuarios, tenants, membresías, reportes, etc.
- No se ha revisado pantalla por pantalla que cada botón y cada tabla funcionen igual que en Next.js.

### Advertiser
- Dashboard con enlaces a Anuncios y Facturación.
- Rutas `/advertiser/ads` y `/advertiser/billing` existen; no está verificado que el contenido y flujos sean 1:1 con Next.js.

---

## Lo que FALTA o hay que revisar

### App pública (actualizado)
- **Comparar vehículos:** flujo completo implementado: CompareProvider, botón "Añadir a comparación" en tarjetas, URL `/compare?vehicles=id1,id2&tenants=t1,t2`, carga por Firestore con getVehicle, quitar de comparación, enlace "Comparar (N)" en catálogo.
- **Catálogo:** filtro por categoría: `/catalog?category=xxx` y `/category/:categoryId` → redirect a catálogo; bodyType, condition, fuelType, transmission aplicados en _getFilteredVehicles.
- **Perfil dealer:** Next.js tiene `/dealer/[id]` (perfil); en Flutter solo catálogo filtrado por dealer.
- **Páginas/rutas que en Next.js existen y en Flutter no:**  
  `/caracteristicas`, `/sobre-nosotros`, `/review/submit`, `/review/rating/[token]`, `/advertise`, `/ads-preview`, `/fi/documents/[token]`, `/survey/[token]`, `/upload-documents/[token]`, `/contracts/sign/[token]`, `/[subdomain]/reviews`, `/[subdomain]/policies`, `/[subdomain]/appointment`, `/[subdomain]/pre-qualify`.
- **Subdominios:** Flutter no usa subdominios por tenant como Next.js.

### Dealer / Seller (actualizado)
- **Rutas anidadas:** /dealer/leads/create, /dealer/leads/:id, /dealer/leads/:id/edit, /dealer/inventory/create, /dealer/inventory/:id, /dealer/inventory/:id/edit (y análogas en /seller). Botones de leads e inventario apuntan a estas rutas.
- **Formularios (crear/editar):** que envíen a Firestore/API igual que en Next.js y que validaciones y mensajes sean equivalentes.
- **Algunas pantallas** pueden ser aún placeholders o listas vacías si no se ha conectado el provider correcto o el `tenantId`.

### Admin
- **Uso real:** no se ha comprobado que listados (usuarios, tenants, membresías, reportes, etc.) carguen datos y que cada acción (crear, editar, aprobar, etc.) funcione como en Next.js.
- **Botones y navegación:** sin verificación sistemática.

### Advertiser
- **Anuncios y facturación:** que las pantallas de ads y billing muestren y actualicen datos (Stripe, estado de anuncios) igual que en Next.js.

### Tiempo real (actualizado)
- Dashboard Dealer/Seller: actualización automática cada 30 s (`Timer.periodic` en DashboardProvider) además del refresh manual.
- No está comprobado en todas las pantallas que los listeners estén bien suscritos y que no haya fugas o dobles suscripciones.

---

## Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Las 5 apps tienen todo exactamente como en Next.js? | **No.** Estructura y rutas sí; detalle de flujos y features no. |
| ¿Cada botón funciona y navega correctamente? | **No verificado.** En público y dashboards sí se tocaron; el resto no está auditado botón por botón. |
| ¿Todo sincronizado y en tiempo real? | **Parcial.** Donde hay streams de Firestore (leads, vehículos, promos, etc.) hay tiempo real; dashboard es bajo demanda; no todo está revisado. |

**Próximos pasos recomendados:**  
1) Pasar por cada app (pública, dealer, seller, admin, advertiser) y probar cada botón y cada pantalla.  
2) Implementar o mapear las rutas/flujos públicos que faltan (comparar, perfil dealer, review, tokens, etc.).  
3) Ajustar lo que falle (navegación, carga de datos, formularios) hasta que el comportamiento sea el mismo que en Next.js.


