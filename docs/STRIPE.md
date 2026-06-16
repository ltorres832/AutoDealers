# Stripe — configuración y flujos

Stripe es el sistema de cobro de membresías, promociones premium y banners. **Todo el procesamiento de webhooks de membresías va por Admin**, no por seller/dealer ni por Cloud Functions duplicadas.

## 1. Credenciales (Admin → Configuración → Stripe)

| Campo | Formato | Uso |
|-------|---------|-----|
| Secret Key | `sk_live_...` o `sk_test_...` | API server-side |
| Publishable Key | `pk_live_...` | Cliente (si aplica) |
| Webhook Secret | `whsec_...` | **Signing secret** del endpoint en Stripe Dashboard |

**No** pegues la URL del webhook en el campo del secreto. La URL va en Stripe Dashboard; el secreto es `whsec_...` al crear el endpoint.

Alternativa: variables de entorno `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en App Hosting (menos flexible que Firestore).

## 2. Webhook en Stripe Dashboard

1. [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. URL (producción):

   `https://admin-app--autodealers-7f62e.us-central1.hosted.app/api/webhooks/stripe`

   (o la URL real de tu `admin-app` si cambia)

3. Eventos mínimos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copiar **Signing secret** → Admin → Stripe → Webhook Secret

5. Verificar: `GET` en la misma URL devuelve JSON con `webhookSecretConfigured: true`

6. En Admin → Configuración → **Probar Stripe** debe responder `success: true`

## 3. Flujos de pago

### Registro público (nuevo dealer/seller)

1. `POST /api/public/register` — crea user + tenant
2. `POST /api/public/checkout/create-session` — Checkout en modo `subscription` con metadata `source: registration`
3. Usuario paga en Stripe
4. Webhook `checkout.session.completed` + `customer.subscription.created` activan cuenta, crean doc en `subscriptions`, procesan referidos

### Upgrade desde seller/dealer

1. `POST /api/membership/upgrade` — Checkout con `subscription_data.metadata` (tenantId, userId, membershipId)
2. Webhook sincroniza membresía en user/tenant y Firestore

### Cambio de plan (dealer settings)

`changeMembership` en `@autodealers/billing` actualiza Stripe (precio) y Firestore cuando hay `stripeSubscriptionId`.

## 4. Idempotencia

Los eventos se registran en `stripe_webhook_events/{eventId}` para evitar doble procesamiento si Stripe reintenta.

## 5. IVA

Tax rate **11.5%** (IVA) se aplica en checkout de membresías cuando existe o se crea en la cuenta Stripe.

## 6. Referidos

Tras el primer pago, el webhook crea el referido (`pending` → `confirmed` al pagar) y programa `scheduled_tasks` a 14 días. Las recompensas se otorgan con el cron `confirmReferralRewardsDaily` o el botón admin **Procesar recompensas (14 días)**.

## 7. No usar

- `seller-app` / `dealer-app` `/api/webhooks/stripe` para membresías (no existen o no son el canal principal)
- Duplicar el mismo endpoint en una Cloud Function `stripeWebhook` (doble procesamiento)

## 8. Deploy

Tras cambios en webhook o checkout, desplegar **admin-app** y **public-web-app** (y seller/dealer si cambian rutas de upgrade).
