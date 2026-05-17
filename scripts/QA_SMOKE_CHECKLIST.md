# Checklist de verificación manual (AutoDealers)

Úsala después de un deploy o cambios críticos. Marca cada ítem según el rol.

## Infra / APIs (sin login)

- [ ] Sitio público carga home sin error de consola bloqueante.
- [ ] `GET /api/public/landing-config` responde 200 (JSON).
- [ ] `GET /api/public/vehicles` responde 200.
- [ ] `GET /api/public/promotions` responde 200.
- [ ] `GET /api/health` en admin responde 200.

## Público (visitante)

- [ ] Búsqueda / listado de vehículos.
- [ ] Detalle de vehículo y formulario de contacto (si aplica).
- [ ] Registro de usuario (flujo completo hasta confirmación o login).

## Admin (plataforma)

- [ ] Login y sesión persistente.
- [ ] Dashboard carga datos (sin 500 en red).
- [ ] Leads: listado y detalle.
- [ ] Inventario / vehículos (según menú).
- [ ] Configuración crítica (branding, integraciones) guarda sin error.

## Dealer (concesionario)

- [ ] Login dealer.
- [ ] Inventario propio y alta/edición de unidad de prueba.
- [ ] Leads asignados al dealer.

## Seller (vendedor)

- [ ] Login seller.
- [ ] Listado de inventario o leads permitidos.
- [ ] Acción de prueba (ej. actualizar estado de lead).

## Advertiser (anunciante)

- [ ] Login advertiser.
- [ ] Dashboard de campañas / anuncios carga.
- [ ] Creación o edición de anuncio (flujo de prueba).

## Pagos / integraciones (staging o prod con cuidado)

- [ ] Stripe: checkout o portal de prueba con tarjeta de test (solo en entorno de test).
- [ ] Webhooks: revisar logs si hubo eventos recientes.

## Notas

- Los **smoke automáticos** en CI comprueban solo rutas públicas y health de admin; el resto requiere esta lista o pruebas E2E dedicadas.
- Para URLs base por entorno, configura `SMOKE_PUBLIC_WEB_URL` y `SMOKE_ADMIN_URL` en GitHub Actions (Variables del repositorio).
