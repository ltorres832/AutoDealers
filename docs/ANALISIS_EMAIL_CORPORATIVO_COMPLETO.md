# Análisis: Email Corporativo + Zoho Mail - Documento Final

## 📋 COMPARACIÓN: Implementado vs Documento Final

### ✅ IMPLEMENTADO (Lo que YA existe)

#### 1. Estructura Base
- ✅ Interfaces `CorporateEmail`, `CorporateEmailUsage`
- ✅ Campos en `User` (corporateEmail, emailSignature)
- ✅ Campos en `Tenant` (corporateEmailsUsed, corporateEmailDomain)
- ✅ Features de membresías (corporateEmailEnabled, maxCorporateEmails, etc.)

#### 2. Servicio Zoho Mail
- ✅ `ZohoMailService` completo con API
- ✅ createEmailAccount, suspendEmailAccount, deleteEmailAccount
- ✅ resetPassword, createEmailAlias

#### 3. Funciones de Negocio
- ✅ createCorporateEmail, getCorporateEmails, suspendCorporateEmail
- ✅ activateCorporateEmail, deleteCorporateEmail
- ✅ updateEmailSignature, resetEmailPassword
- ✅ canCreateCorporateEmail, getCorporateEmailUsage

#### 4. API Routes
- ✅ Seller: GET, POST, PUT, PATCH
- ✅ Dealer: GET, POST, PATCH, DELETE
- ✅ Webhook Zoho: POST /api/webhooks/zoho-email

#### 5. UI
- ✅ Página Seller: /settings/corporate-email
- ✅ Página Dealer: /settings/corporate-emails
- ✅ Modales y editores

#### 6. Automatización
- ✅ Suspensión automática (Stripe webhook)
- ✅ Reactivación automática (pago exitoso)
- ✅ Emails entrantes → leads automáticos

---

### ❌ FALTA IMPLEMENTAR (Según Documento Final)

#### 1. Modelo de Aliases vs Emails Completos

**Documento requiere:**
- Sistema de **ALIASES** (ej: `ventas@dealer.autodealers.com`)
- No emails completos de usuarios, solo aliases
- Límites por membresía: Básica (1), Avanzada (3), Pro (ilimitados)

**Estado actual:**
- ❌ Implementamos emails completos, no aliases
- ❌ Límites están, pero estructura es diferente
- ⚠️ Necesitamos cambiar de emails completos a sistema de aliases

---

#### 2. Roles: Master Dealer

**Documento requiere:**
- ✅ `admin`
- ❌ `master_dealer` (NUEVO)
- ✅ `dealer`
- ✅ `vendedor` (tenemos `seller`)

**Estado actual:**
- ❌ No existe `master_dealer` role
- ⚠️ Necesitamos agregar este rol y su lógica

---

#### 3. Membresías Multi Dealer

**Documento requiere:**
- Multi Dealer 1
- Multi Dealer 2
- Multi Dealer 3
- Solo visibles con aprobación admin

**Estado actual:**
- ❌ No existen membresías Multi Dealer
- ❌ No hay sistema de aprobación para membresías especiales

---

#### 4. Estructura Firestore: Colecciones Específicas

**Documento requiere:**
```json
// Colección: users
{
  "uid": "firebase_uid",
  "rol": "dealer",
  "membresia": "dealer_pro",
  "status": "active",
  "emailAliases": 3  // Número de aliases permitidos
}

// Colección: dealers
{
  "dealerId": "dealer123",
  "ownerUid": "uid",
  "membresia": "multi_dealer_2",
  "aliasesUsed": 2,
  "approvedByAdmin": true  // Aprobación requerida
}

// Colección: email_aliases
{
  "alias": "ventas@dealer.autodealers.com",
  "dealerId": "dealer123",
  "assignedTo": "uid",
  "active": true,
  "createdAt": "timestamp"
}
```

**Estado actual:**
- ✅ Tenemos `users` pero sin `emailAliases` (tiene `corporateEmail`)
- ❌ No tenemos colección `dealers` separada (usamos `tenants`)
- ❌ No tenemos colección `email_aliases` (tenemos `corporate_emails` en subcolección de tenants)
- ❌ No tenemos campo `approvedByAdmin` en dealers

---

#### 5. Cloud Functions para Creación Automática

**Documento requiere:**
- Cloud Function: `onWrite dealers`
- Lógica: Si dealer aprobado && membresía permite → crear alias en Zoho

**Estado actual:**
- ❌ No hay Cloud Functions configuradas
- ⚠️ Todo se hace desde API routes (Next.js), no Functions
- ❌ No hay triggers automáticos al aprobar dealer

---

#### 6. SMTP para Envíos

**Documento requiere:**
```
Host: smtp.zoho.com
Port: 587
TLS: true
User: sistema@autodealers.com
```

Usado para:
- Contactos
- Leads
- Notificaciones

**Estado actual:**
- ✅ Tenemos `EmailService` (Resend/SendGrid)
- ❌ No tenemos configuración SMTP de Zoho
- ❌ No está configurado para usar `sistema@autodealers.com`

---

#### 7. Aprobación de Dealers por Admin

**Documento requiere:**
- Dealers nuevos: estado = `pending`
- Admin aprueba → trigger → habilitar membresías → crear aliases

**Estado actual:**
- ❌ No hay sistema de aprobación de dealers
- ❌ No hay estado `pending` para dealers
- ❌ No hay panel admin para aprobar dealers

---

#### 8. Panel Admin Completo

**Documento requiere:**
Admin puede:
- Aprobar dealers
- Cambiar membresías
- Ver aliases activos
- Suspender correos
- Forzar límites

**Estado actual:**
- ❌ No hay panel admin para gestionar dealers
- ❌ No hay panel admin para ver todos los aliases
- ❌ No hay panel admin para aprobar dealers
- ✅ Tenemos suspensión (pero no desde panel admin)

---

#### 9. Upgrade/Downgrade Automático de Aliases

**Documento requiere:**
1. Admin cambia membresía
2. Trigger Function
3. Ajusta aliases
4. Bloquea excedentes

**Estado actual:**
- ❌ No hay lógica de ajuste automático de aliases
- ❌ No hay bloqueo de excedentes al downgrade

---

#### 10. Sincronización Tiempo Real con Firestore Listeners

**Documento requiere:**
- Firestore listeners
- Cambios reflejados inmediato
- Admin controla en vivo

**Estado actual:**
- ✅ Tenemos hooks `useRealtimeX` en varios módulos
- ⚠️ Necesitamos hooks para emails corporativos/aliases
- ✅ Ya tenemos `onSnapshot` en varios lugares

---

#### 11. Dominio y Subdominios

**Documento requiere:**
- Dominio: `autodealers.com`
- Subdominios por dealer: `dealer1.autodealers.com`

**Estado actual:**
- ⚠️ Configuramos `autoplataforma.com` (variable `CORPORATE_EMAIL_DOMAIN`)
- ✅ Soporte para subdominios existe
- ⚠️ Necesitamos confirmar dominio exacto

---

#### 12. Usuarios Zoho Limitados

**Documento requiere:**
- `sistema@autodealers.com`
- `soporte@autodealers.com`

**Estado actual:**
- ❌ No están configurados como usuarios limitados
- ❌ No hay gestión de usuarios Zoho desde admin

---

## 📊 RESUMEN DE GAPS

### CRÍTICOS (Deben implementarse)

1. **Sistema de Aliases** (no emails completos)
   - Cambiar estructura de `CorporateEmail` a `EmailAlias`
   - Crear colección `email_aliases` en Firestore
   - Modificar lógica para trabajar con aliases

2. **Aprobación de Dealers**
   - Agregar campo `approvedByAdmin: boolean` a `Tenant`
   - Estado `pending` para nuevos dealers
   - Panel admin para aprobar dealers
   - Cloud Function o API trigger al aprobar

3. **Rol Master Dealer**
   - Agregar `master_dealer` a `UserRole`
   - Lógica de permisos para master dealers
   - UI para master dealers

4. **Membresías Multi Dealer**
   - Crear membresías: `multi_dealer_1`, `multi_dealer_2`, `multi_dealer_3`
   - Features especiales para multi dealer
   - Aprobación requerida para multi dealer

5. **Cloud Functions (o equivalente)**
   - Trigger automático al aprobar dealer
   - Creación automática de aliases
   - Ajuste automático en upgrade/downgrade

6. **SMTP Zoho**
   - Configurar SMTP de Zoho (smtp.zoho.com:587)
   - Usar `sistema@autodealers.com` para envíos
   - Integrar con EmailService existente

7. **Panel Admin Completo**
   - Página para aprobar dealers
   - Página para ver todos los aliases
   - Panel para cambiar membresías y ver impacto

### IMPORTANTES (Mejoran funcionalidad)

8. **Firestore Listeners en Tiempo Real**
   - Hook `useRealtimeEmailAliases` para sellers
   - Hook `useRealtimeEmailAliases` para dealers
   - Hook `useRealtimeDealers` para admin

9. **Upgrade/Downgrade Automático**
   - Función para ajustar aliases al cambiar membresía
   - Bloqueo de excedentes
   - Notificación al usuario

10. **Gestión de Usuarios Zoho**
    - Panel admin para ver usuarios Zoho limitados
    - Gestión de `sistema@` y `soporte@`

### MENORES (Mejoras opcionales)

11. **Validación de Dominio**
    - Confirmar dominio exacto (`autodealers.com` vs `autoplataforma.com`)
    - Documentación de subdominios

12. **Logs y Auditoría**
    - Logs de creación/suspensión de aliases
    - Historial de cambios de membresías

---

## 🎯 PLAN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Fundación (Alta Prioridad)
1. Agregar rol `master_dealer`
2. Agregar campo `approvedByAdmin` a `Tenant`
3. Crear membresías Multi Dealer (1, 2, 3)
4. Modificar estructura de emails → aliases

### Fase 2: Aprobación y Automatización (Alta Prioridad)
5. Sistema de aprobación de dealers
6. Panel admin para aprobar dealers
7. Trigger automático (Cloud Function o API route) al aprobar
8. Creación automática de aliases

### Fase 3: SMTP y Configuración (Media Prioridad)
9. Configurar SMTP Zoho
10. Integrar SMTP con EmailService
11. Usar `sistema@autodealers.com` para envíos

### Fase 4: Panel Admin Completo (Media Prioridad)
12. Panel admin: ver todos los aliases
13. Panel admin: cambiar membresías
14. Panel admin: suspender correos
15. Panel admin: forzar límites

### Fase 5: Upgrade/Downgrade Automático (Baja Prioridad)
16. Función de ajuste automático de aliases
17. Bloqueo de excedentes
18. Notificaciones

### Fase 6: Tiempo Real y Optimizaciones (Baja Prioridad)
19. Hooks `useRealtimeEmailAliases`
20. Optimizaciones de rendimiento
21. Logs y auditoría

---

## 📝 NOTAS IMPORTANTES

1. **Sistema de Aliases vs Emails Completos:**
   - El documento especifica **ALIASES**, no emails completos
   - Necesitamos cambiar la arquitectura actual
   - Un alias puede ser asignado a diferentes usuarios

2. **Cloud Functions vs API Routes:**
   - El documento menciona Cloud Functions
   - Actualmente usamos API Routes de Next.js
   - Podemos simular con API routes o implementar Functions reales

3. **Dominio:**
   - Documento: `autodealers.com`
   - Implementación: `autoplataforma.com`
   - Necesitamos confirmar cuál usar o hacer configurable

4. **Colecciones Firestore:**
   - Documento especifica `dealers` y `email_aliases` como colecciones principales
   - Actualmente usamos `tenants` y subcolecciones
   - Necesitamos decidir: mantener estructura actual o migrar

---

## ✅ ESTIMACIÓN DE ESFUERZO

| Fase | Tareas | Esfuerzo | Prioridad |
|------|--------|----------|-----------|
| Fase 1 | Fundación (4 tareas) | 3-4 horas | Alta |
| Fase 2 | Aprobación (4 tareas) | 4-5 horas | Alta |
| Fase 3 | SMTP (3 tareas) | 2-3 horas | Media |
| Fase 4 | Panel Admin (4 tareas) | 4-5 horas | Media |
| Fase 5 | Upgrade/Downgrade (3 tareas) | 2-3 horas | Baja |
| Fase 6 | Tiempo Real (3 tareas) | 2-3 horas | Baja |

**TOTAL ESTIMADO:** 17-23 horas de desarrollo

---

**Última actualización:** $(date)
**Verificado por:** Sistema de Análisis Automático



