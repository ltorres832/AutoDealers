import type { HttpsOptions } from 'firebase-functions/v2/https';

/** Meta / Stripe deben poder invocar sin IAM; mismo patrón en todos los webhooks HTTP. */
export const publicWebhookHttpsOptions: HttpsOptions = {
  cors: true,
  maxInstances: 10,
  invoker: 'public',
};
