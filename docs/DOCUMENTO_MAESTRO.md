# DOCUMENTO MAESTRO – PLATAFORMA SaaS PARA DEALERS Y VENDEDORES

> **Estado:** Diseño Enterprise Completo (Visión Total)  
> **Objetivo:** Definir ABSOLUTAMENTE TODO el sistema sin dejar fuera ninguno de los puntos solicitados (los 24 puntos + todo lo hablado previamente), con arquitectura preparada para activación por módulos.

---

## 1. VISIÓN GENERAL DEL SISTEMA

Plataforma SaaS multi-tenant diseñada para **dealers de autos y vendedores individuales**, donde cada usuario tiene:

* Dashboard propio
* CRM centralizado
* Página web pública sincronizada
* Subdominio personalizado (según membresía)
* Integración con redes sociales
* Automatización con IA
* Sistema de citas, seguimiento, recordatorios, reportes y ventas

Todo el sistema es **controlado y administrado desde un Panel Administrativo Supremo**.

---

## 2. TIPOS DE USUARIOS Y ROLES

### 2.1 Administrador (Admin Supremo)

* Control total de la plataforma sin excepción
* Acceso a todos los dealers, vendedores y CRMs
* Gestión de membresías, pagos, integraciones, IA, templates, subdominios y logs

### 2.2 Dealer

* Empresa o individuo con inventario propio
* Puede crear y gestionar vendedores (según membresía)
* Tiene dashboard, CRM, web pública y subdominio
* Puede ver el CRM de sus vendedores (NO redes sociales privadas)

### 2.3 Vendedor

* Usuario individual
* Dashboard y CRM propios
* Puede pertenecer a un dealer o ser independiente
* Subdominio propio si la membresía lo permite

---

## 3. ARQUITECTURA GENERAL

* **Multi-tenant** (cada dealer/vendedor aislado lógicamente)
* **CRM central como núcleo**
* Módulos independientes activables por membresía
* Integraciones desacopladas (Meta, WhatsApp, Stripe, IA)
* Backend preparado para Firebase / Node.js / Next.js / Flutter

---

## 4. CRM CENTRAL (NÚCLEO DEL SISTEMA)

El CRM es el corazón del sistema. **Todo entra aquí sin excepción**:

* Leads de todos los canales
* Mensajes
* Seguimientos
* Citas
* Pruebas de manejo
* Recordatorios post-venta
* Ventas
* Reportes

Cada registro incluye:

* Fuente
* Fecha
* Usuario asignado
* Estado
* Historial completo

---

## 5. MENSAJERÍA OMNICANAL

### Canales integrados:

* WhatsApp Business API
* Facebook Messenger (DM)
* Instagram DM
* Formularios web
* Email
* SMS

Todos los mensajes:

* Llegan al CRM
* Se responden desde el CRM
* Generan notificaciones

IA puede responder automáticamente y notificar al usuario.

---

## 6. REDES SOCIALES Y PUBLICACIONES

Desde el dashboard:

* Crear posts
* Programar publicaciones
* Publicar en Facebook, Instagram, TikTok (limitado por API)
* Asistencia de IA para textos, hashtags y horarios

Facebook Marketplace:

* Flujo asistido (no automático)

---

## 7. SISTEMA DE IA INTEGRADO

IA transversal al sistema:

* Respuestas automáticas iniciales
* Clasificación de leads
* Seguimientos automáticos
* Creación de posts
* Programación sugerida
* Sugerencias de respuestas
* Generación de reportes

IA **asiste y automatiza**, no actúa sin reglas.

---

## 8. INVENTARIO DE VEHÍCULOS

* Registro completo de autos
* Fotos
* Precio
* Estado (disponible / vendido)
* Sincronización con web pública

---

## 9. LEADS Y SEGUIMIENTO

* Registro automático por canal
* Identificación de fuente
* Acciones manuales y automáticas
* Invitaciones a ver inventario
* Enlaces de pago

---

## 10. CITAS Y PRUEBAS DE MANEJO

### Funciones:

* Agenda de citas
* Selección de vendedor
* Selección de vehículo(s)
* Horarios disponibles
* Notificaciones por email y sistema

---

## 11. RECORDATORIOS POST-VENTA

Automáticos y manuales:

* Cambio de aceite
* Filtro
* Rotación de gomas
* Otros personalizados

Frecuencias:

* Mensual
* 3 meses
* 6 meses
* Manual

Canales:

* Email
* SMS
* WhatsApp

---

## 12. REPORTES AVANZADOS

Reportes de:

* Leads
* Ventas
* Conversiones
* Rendimiento por vendedor
* Redes sociales
* IA

---

## 13. SUBDOMINIOS Y WEBS PÚBLICAS

* Subdominios dinámicos
* Branding personalizado (logo, favicon)
* Contenido sincronizado desde dashboard

Dependiente de membresía.

---

## 14. MEMBRESÍAS

### Tipos:

* Membresías para Dealers
* Membresías para Vendedores

### Control:

* Creadas desde admin
* Beneficios detectados automáticamente
* Upgrade / downgrade

---

## 15. STRIPE Y FACTURACIÓN

* Cobro automático cada 30 días
* Cancelación hasta 7 días antes
* Webhooks
* Suspensiones automáticas

---

## 16. TEMPLATES DE EMAIL Y MENSAJES

* Templates creados desde admin
* Editables por usuarios
* Templates separados por rol

---

## 17. NOTIFICACIONES

* Sistema
* Email
* Eventos críticos

---

## 18. PANEL ADMINISTRATIVO SUPREMO

Control total de:

* Usuarios
* CRMs
* Mensajes
* Membresías
* Pagos
* IA
* Logs
* Seguridad

---

## 19. SEGURIDAD Y PERMISOS

* Roles estrictos
* Accesos dinámicos
* Auditoría completa

---

## 20. LOGS Y AUDITORÍA

* Acciones
* Cambios
* Mensajes
* Pagos

---

## 21. ESCALABILIDAD

* Arquitectura modular
* Activación por fases
* Sin reescritura

---

## 22. ROADMAP DE ACTIVACIÓN

* **Fase 1:** Core + CRM + Web + Billing
* **Fase 2:** Mensajería + Citas + Recordatorios
* **Fase 3:** IA avanzada + Social + Marketplace asistido

---

## 23. REGLAS CRÍTICAS DEL SISTEMA

* Todo pasa por el CRM
* Todo es controlado por el admin
* Nada se ejecuta sin permisos

---

## 24. CIERRE

Este documento define **la totalidad del sistema**, sin excepciones, y sirve como base única para desarrollo, negocio y escalabilidad.





