# Verificación: Email Corporativo + CRM

## 📋 ESTADO ACTUAL DE IMPLEMENTACIÓN

### ❌ NO IMPLEMENTADO (0%)

#### 1. Estructura de Datos
- ❌ Campo `corporateEmail` en `User` interface
- ❌ Campo `corporateEmails` en `Tenant` interface (para dealers)
- ❌ Campo `emailSignature` en `User` interface
- ❌ Colección `corporate_emails` en Firestore
- ❌ Tipo `CorporateEmail` interface

#### 2. Features de Membresías
- ❌ `maxCorporateEmails?: number` en `MembershipFeatures`
- ❌ `corporateEmailEnabled: boolean` en `MembershipFeatures`
- ❌ `emailSignatureBasic: boolean` en `MembershipFeatures`
- ❌ `emailSignatureAdvanced: boolean` en `MembershipFeatures`
- ❌ `emailAliases: boolean` en `MembershipFeatures`

#### 3. Integración Zoho Mail
- ❌ Servicio `ZohoMailService` clase
- ❌ Función `createEmailAccount()` - Crear email vía API
- ❌ Función `suspendEmailAccount()` - Suspender email
- ❌ Función `deleteEmailAccount()` - Eliminar email
- ❌ Función `resetPassword()` - Cambiar contraseña
- ❌ Variables de entorno para Zoho API

#### 4. Funciones de Negocio
- ❌ `createCorporateEmail()` - Crear email corporativo
- ❌ `getCorporateEmails()` - Listar emails del usuario/tenant
- ❌ `suspendCorporateEmail()` - Suspender email
- ❌ `deleteCorporateEmail()` - Eliminar email
- ❌ `updateEmailSignature()` - Actualizar firma
- ❌ `checkEmailLimit()` - Verificar límite según membresía
- ❌ `getAvailableEmails()` - Obtener emails disponibles/usados

#### 5. UI - Seller Dashboard
- ❌ Página `/settings/corporate-email` - Activar email
- ❌ Modal para crear email corporativo
- ❌ Editor de firma de email (básica/avanzada)
- ❌ Vista de estado del email (Activo/Suspendido)
- ❌ Botón para cambiar contraseña
- ❌ Preview del dominio (@dealer.autoplataforma.com)

#### 6. UI - Dealer Dashboard
- ❌ Página `/settings/corporate-emails` - Gestión de emails
- ❌ Lista de usuarios con emails corporativos
- ❌ Contador: Emails usados / disponibles
- ❌ Modal para crear email para usuario/seller
- ❌ Acciones: Crear / Suspender / Eliminar
- ❌ Vista de F&I y vendedores con emails

#### 7. Integración con CRM
- ❌ Webhook para recibir emails entrantes
- ❌ Función para crear lead automático desde email
- ❌ Guardado de emails salientes en historial
- ❌ Vinculación de emails a leads existentes
- ❌ Timeline de conversaciones por email

#### 8. Lógica de Permisos
- ❌ Validación de membresía al crear email
- ❌ Validación de límites (emails usados < maxEmails)
- ❌ Suspensión automática al expirar membresía
- ❌ Reactivación automática al renovar membresía
- ❌ Downgrade automático (suspender emails extra)

#### 9. API Routes
- ❌ `POST /api/corporate-email` - Crear email
- ❌ `GET /api/corporate-email` - Listar emails
- ❌ `PATCH /api/corporate-email/[id]` - Actualizar (firma, etc.)
- ❌ `POST /api/corporate-email/[id]/suspend` - Suspender
- ❌ `POST /api/corporate-email/[id]/activate` - Activar
- ❌ `DELETE /api/corporate-email/[id]` - Eliminar
- ❌ `POST /api/corporate-email/[id]/reset-password` - Cambiar contraseña
- ❌ `POST /api/webhooks/zoho-email` - Webhook para emails entrantes

#### 10. Configuración
- ❌ Variables de entorno: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_DOMAIN`
- ❌ Dominio base: `autoplataforma.com` (o configurable)
- ❌ Formato de email: `usuario@dealer.autoplataforma.com`

---

## ✅ IMPLEMENTADO (100%)

### Lo que YA existe:

1. **Sistema de Membresías**
   - ✅ Estructura básica de membresías
   - ✅ Features booleanas en `MembershipFeatures`
   - ✅ Suscripciones con Stripe
   - ✅ Webhooks de Stripe

2. **Sistema de Email Transaccional**
   - ✅ `EmailService` para enviar emails (Resend/SendGrid)
   - ✅ Envío de notificaciones
   - ✅ Templates de email

3. **CRM Básico**
   - ✅ Gestión de leads
   - ✅ Historial de mensajes
   - ✅ Sistema de interacciones

4. **UI Base**
   - ✅ Estructura de settings en Seller y Dealer
   - ✅ Páginas de membresía
   - ✅ Sistema de autenticación

---

## 📝 REQUERIMIENTOS DEL DOCUMENTO MAESTRO

### 2️⃣ FORMATO DE EMAIL
```
usuario@dealer.autoplataforma.com
```

**Ejemplos:**
- `juan@autocity.autoplataforma.com`
- `fi@autocity.autoplataforma.com`
- `ventas@autocity.autoplataforma.com`

**Estado:** ❌ NO IMPLEMENTADO

---

### 3️⃣ MEMBRESÍAS - VENDEDORES

#### 🧍‍♂️ VENDEDOR BASIC
- ❌ Email corporativo

#### 🧍‍♂️ VENDEDOR PRO
- ❌ 1 Email corporativo automático
- ❌ Firma profesional
- ✅ CRM completo (YA EXISTE)

#### 🧍‍♂️ VENDEDOR ELITE
- ❌ 1 Email corporativo
- ❌ Alias (ej: ventas@)
- ❌ Firma avanzada

**Estado:** ❌ NO IMPLEMENTADO

---

### 4️⃣ MEMBRESÍAS - DEALERS

#### 🏢 DEALER BASIC
- ❌ Emails corporativos

#### 🏢 DEALER PRO
- ❌ 5 Emails corporativos
- ❌ Usuarios internos (vendedores + F&I)
- ✅ CRM compartido (YA EXISTE)

#### 🏢 DEALER ENTERPRISE
- ❌ Emails ilimitados (uso justo)
- ❌ Múltiples F&I
- ✅ Reportes avanzados (YA EXISTE)

**Estado:** ❌ NO IMPLEMENTADO

---

### 6️⃣ FLUJO TÉCNICO - CREACIÓN AUTOMÁTICA

**Pseudológica:**
```python
if plan.includes('email'):
    if emails_usados < limite_plan:
        crear_email_api()
    else:
        bloquear()
else:
    mostrar_upgrade()
```

**Estado:** ❌ NO IMPLEMENTADO

---

### 7️⃣ PROVEEDOR DE EMAIL

**Recomendado:** Zoho Mail (API + escalabilidad)

**Funciones necesarias:**
- ❌ Crear usuario
- ❌ Suspender usuario
- ❌ Eliminar usuario

**Estado:** ❌ NO IMPLEMENTADO

---

### 8️⃣ INTEGRACIÓN CRM

- ❌ Correos entrantes → lead automático
- ❌ Correos salientes → historial
- ❌ Conversaciones unificadas

**Estado:** ❌ NO IMPLEMENTADO

---

### 9️⃣ UX - PANTALLAS CLAVE

#### 📱 Pantalla 1 – Activación Email
- ❌ Campo: nombre de email
- ❌ Preview del dominio
- ❌ Botón: Crear email

#### 📱 Pantalla 2 – Email Activo
- ❌ Estado: Activo / Suspendido
- ❌ Botón: Cambiar contraseña
- ❌ Firma editable

#### 📱 Pantalla 3 – CRM
- ✅ Inbox integrada (EXISTE PARCIALMENTE)
- ✅ Leads vinculados (EXISTE PARCIALMENTE)
- ❌ Timeline de comunicaciones por email

#### 📱 Pantalla 4 – Dealer Admin
- ❌ Lista de usuarios
- ❌ Emails usados / disponibles
- ❌ Crear / suspender

**Estado:** ❌ NO IMPLEMENTADO (excepto parcialmente CRM)

---

### 🔐 SEGURIDAD

- ❌ Contraseña temporal
- ❌ Cambio obligatorio
- ❌ Sin control DNS
- ❌ Sin SMTP libre

**Estado:** ❌ NO IMPLEMENTADO

---

### 1️⃣0️⃣ ESCENARIOS CLAVE

1. **Vendedor con plan / dealer sin plan → email individual activo**
   - ❌ NO IMPLEMENTADO

2. **Dealer con plan / vendedor sin plan → email solo si lo crea el dealer**
   - ❌ NO IMPLEMENTADO

3. **Plan expira → email suspendido**
   - ❌ NO IMPLEMENTADO

**Estado:** ❌ NO IMPLEMENTADO

---

## 📊 RESUMEN EJECUTIVO

### Estado General: **0% IMPLEMENTADO**

| Componente | Estado | Porcentaje |
|------------|--------|------------|
| Estructura de Datos | ❌ | 0% |
| Features de Membresías | ❌ | 0% |
| Integración Zoho Mail | ❌ | 0% |
| Funciones de Negocio | ❌ | 0% |
| UI Seller Dashboard | ❌ | 0% |
| UI Dealer Dashboard | ❌ | 0% |
| Integración CRM | ❌ | 0% |
| Lógica de Permisos | ❌ | 0% |
| API Routes | ❌ | 0% |
| Configuración | ❌ | 0% |

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### Fase 1: Fundación (Alta Prioridad)
1. Agregar campos `corporateEmail` a interfaces
2. Agregar features de email a `MembershipFeatures`
3. Crear `ZohoMailService` básico
4. Crear funciones `createCorporateEmail`, `suspendCorporateEmail`

### Fase 2: UI Básica (Alta Prioridad)
5. Crear página de activación de email en Seller
6. Crear página de gestión de emails en Dealer
7. Implementar lógica de límites y permisos

### Fase 3: Integración CRM (Media Prioridad)
8. Crear webhook para emails entrantes
9. Integrar con sistema de leads
10. Guardar emails en historial

### Fase 4: Funciones Avanzadas (Baja Prioridad)
11. Sistema de firmas avanzadas
12. Aliases de email
13. Cambio de contraseña
14. Preview de dominio

---

## ⚠️ NOTA IMPORTANTE

El usuario indica que **"Lo de las membresías es adicional a lo que ya está implementado y configurado"**, lo que significa que:

1. ✅ Las membresías EXISTENTES deben mantenerse
2. ✅ Se deben AGREGAR las features de email corporativo a las membresías existentes
3. ✅ NO se debe modificar la estructura actual de membresías
4. ✅ Se debe integrar el email corporativo como un módulo adicional

---

## 📚 DOCUMENTOS RELACIONADOS

- Documento Maestro de Email Corporativo (proporcionado por usuario)
- `packages/billing/src/types.ts` - Estructura de membresías
- `packages/core/src/types.ts` - Tipos de User y Tenant
- `packages/messaging/src/email.ts` - EmailService transaccional existente

---

**Última actualización:** $(date)
**Verificado por:** Sistema de Verificación Automática



