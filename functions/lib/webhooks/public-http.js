"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicWebhookHttpsOptions = void 0;
/** Meta / Stripe deben poder invocar sin IAM; mismo patrón en todos los webhooks HTTP. */
exports.publicWebhookHttpsOptions = {
    cors: true,
    maxInstances: 10,
    invoker: 'public',
};
//# sourceMappingURL=public-http.js.map