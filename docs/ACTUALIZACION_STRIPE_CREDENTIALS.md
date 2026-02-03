# 🔄 Actualización de Credenciales de Stripe - Guía de Migración

## ✅ Archivos Ya Actualizados

Los siguientes archivos ya han sido actualizados para usar el sistema automático de credenciales desde Firestore:

1. ✅ `packages/core/src/credentials.ts` - Funciones para obtener credenciales
2. ✅ `packages/core/src/stripe-helper.ts` - Helper para crear instancias de Stripe
3. ✅ `apps/admin/src/app/api/webhooks/stripe/route.ts` - Webhook de Stripe
4. ✅ `apps/advertiser/src/app/api/advertiser/ads/route.ts` - Creación de anuncios
5. ✅ `apps/advertiser/src/app/api/advertiser/ads/[id]/confirm-payment/route.ts` - Confirmación de pago

## 📋 Archivos Pendientes de Actualizar

### Patrón de Actualización

**ANTES:**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});
```

**DESPUÉS:**
```typescript
import { getStripeInstance } from '@autodealers/core';

// Dentro de la función async:
const stripe = await getStripeInstance();
```

### Para StripeService (paquete billing)

**ANTES:**
```typescript
import { StripeService } from '@autodealers/billing';

const stripeService = new StripeService(process.env.STRIPE_SECRET_KEY || '');
```

**DESPUÉS:**
```typescript
import { getStripeService } from '@autodealers/core';

// Dentro de la función async:
const stripeService = await getStripeService();
```

### Para Webhook Secret

**ANTES:**
```typescript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
```

**DESPUÉS:**
```typescript
import { getStripeWebhookSecretValue } from '@autodealers/core';

// Dentro de la función async:
const webhookSecret = await getStripeWebhookSecretValue();
```

## 📝 Lista de Archivos por Actualizar

### Admin App
- [ ] `apps/admin/src/app/api/admin/advertisers/[id]/ads/[adId]/confirm-payment/route.ts`
- [ ] `apps/admin/src/app/api/admin/advertisers/[id]/ads/[adId]/payment-session/route.ts`
- [ ] `apps/admin/src/app/api/admin/advertisers/[id]/billing/setup-session/route.ts`
- [ ] `apps/admin/src/app/api/admin/advertisers/[id]/billing/payment-methods/route.ts`
- [ ] `apps/admin/src/app/api/admin/advertisers/[id]/billing/payment-methods/detach/route.ts`
- [ ] `apps/admin/src/app/api/admin/advertisers/[id]/billing/payment-methods/default/route.ts`
- [ ] `apps/admin/src/app/api/admin/memberships/create-default/route.ts`
- [ ] `apps/admin/src/app/api/admin/memberships/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/dashboard/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/subscriptions/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/subscriptions/[id]/cancel/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/products/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/payments/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/payments/[id]/refund/route.ts`
- [ ] `apps/admin/src/app/api/admin/stripe/customers/route.ts`

### Dealer App
- [ ] `apps/dealer/src/app/api/promotions/paid/purchase/route.ts`
- [ ] `apps/dealer/src/app/api/promotions/paid/confirm-payment/route.ts`
- [ ] `apps/dealer/src/app/api/promotions/assigned/pay/route.ts`
- [ ] `apps/dealer/src/app/api/promotions/assigned/confirm-payment/route.ts`
- [ ] `apps/dealer/src/app/api/banners/purchase/route.ts`
- [ ] `apps/dealer/src/app/api/banners/confirm-payment/route.ts`
- [ ] `apps/dealer/src/app/api/banners/assigned/pay/route.ts`
- [ ] `apps/dealer/src/app/api/banners/assigned/confirm-payment/route.ts`
- [ ] `apps/dealer/src/app/api/payments/create-intent/route.ts`
- [ ] `apps/dealer/src/app/api/membership/upgrade/route.ts`
- [ ] `apps/dealer/src/app/api/promotions/premium/request/route.ts`

### Seller App
- [ ] `apps/seller/src/app/api/promotions/paid/purchase/route.ts`
- [ ] `apps/seller/src/app/api/promotions/paid/confirm-payment/route.ts`
- [ ] `apps/seller/src/app/api/promotions/assigned/pay/route.ts`
- [ ] `apps/seller/src/app/api/promotions/assigned/confirm-payment/route.ts`
- [ ] `apps/seller/src/app/api/banners/purchase/route.ts`
- [ ] `apps/seller/src/app/api/banners/confirm-payment/route.ts`
- [ ] `apps/seller/src/app/api/payments/create-intent/route.ts`
- [ ] `apps/seller/src/app/api/membership/upgrade/route.ts`
- [ ] `apps/seller/src/app/api/promotions/premium/request/route.ts`

### Advertiser App
- [ ] `apps/advertiser/src/app/api/advertiser/billing/setup-session/route.ts`
- [ ] `apps/advertiser/src/app/api/advertiser/billing/payment-methods/route.ts`
- [ ] `apps/advertiser/src/app/api/advertiser/billing/payment-methods/detach/route.ts`
- [ ] `apps/advertiser/src/app/api/advertiser/billing/payment-methods/default/route.ts`
- [ ] `apps/advertiser/src/app/api/advertiser/payments/route.ts`
- [ ] `apps/advertiser/src/app/api/advertiser/register/route.ts`
- [ ] `apps/advertiser/src/app/api/payments/create-intent/route.ts`
- [ ] `apps/advertiser/src/app/api/webhooks/stripe/route.ts`

### Public Web App
- [ ] `apps/public-web/src/app/api/public/register/route.ts`
- [ ] `apps/public-web/src/app/api/payments/create-intent/route.ts`
- [ ] `apps/public-web/src/app/api/payments/create-subscription/route.ts`

### Packages
- [ ] `packages/core/src/advertiser-pricing.ts`
- [ ] `packages/billing/src/stripe.ts` (actualizar constructor para aceptar async o crear factory)

## 🚀 Ventajas del Sistema Automático

1. **Sincronización Centralizada**: Las credenciales se configuran una vez en el admin y se sincronizan automáticamente
2. **Sin Reinicio de Servidores**: Los cambios se aplican inmediatamente sin necesidad de reiniciar
3. **Fallback Seguro**: Si no hay credenciales en Firestore, usa variables de entorno como respaldo
4. **Mensajes de Error Claros**: Indica exactamente dónde configurar las credenciales si faltan

## ⚠️ Notas Importantes

- Todas las funciones que usan Stripe deben ser `async` para poder obtener las credenciales
- Las instancias de Stripe deben crearse dentro de las funciones async, no como constantes globales
- El sistema funciona tanto con credenciales desde Firestore como con variables de entorno

## 🔍 Cómo Verificar que Funciona

1. Configura las credenciales en `Admin → Configuración → General → Stripe`
2. Intenta crear un pago o suscripción desde cualquier app
3. Verifica que funciona sin necesidad de configurar variables de entorno
4. Si hay error, verifica que las credenciales estén guardadas correctamente en Firestore

