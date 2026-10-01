# Vehicle description architecture audit — 2026-09-27

Audit completed before implementation. Existing worktree changes are preserved.

## Existing integration points

- Next.js monorepo: dealer, seller, public-web and admin; shared inventory/core/AI/messaging packages.
- Inventory lives at `tenants/{tenantId}/vehicles/{vehicleId}`. `createVehicle` / `updateVehicle` preserve VIN, stock, specifications, commissions and visibility. VIN is required by existing inventory policy; description generation can accept confirmed facts without VIN without changing that policy.
- Dealer creation: `apps/dealer/src/app/inventory/page.tsx`; editing: `components/VehiclesList.tsx`. Seller creation/editing: separate modals in `apps/seller/src/app/inventory/page.tsx`.
- Both portals already use Firebase auth and Firestore onSnapshot inventory hooks. Seller ownership is resolved by `findSellerVehicleById`; shared dealer inventory is read-only to unassigned sellers.
- NHTSA equipment is normalized in inventory/vin-details and shared/vehicle-equipment. Manual overrides are preserved; optional/unknown equipment must not become confirmed facts.
- `description` is currently the compatibility field consumed by public details, listings and sharing. Shared social modal starts with this text, but explicit AI routes can still create channel-specific text.
- An untracked VehicleDescriptionService skeleton and seller endpoint use placeholder English text, no provider, unsafe history array timestamps, and no complete ownership/concurrency checks. The creation UI also contains a simulated client generator. These must be completed, not shipped as AI.
- OpenAI credentials: core/credentials and ai-config; content membership gate: tenantCanGenerateContent. Existing direct backend Chat Completions integration can be reused with strict structured output validation.
- Admin global configuration: `system/ai_config`; dashboard feature flags: `feature_flags`. Absent generic flags currently default ON, unsuitable for this rollout: this feature requires explicit opt-in.
- Firestore vehicles are publicly readable. History, prompts, usage, drafts and audit must therefore be separate private documents, not public vehicle arrays. Current client write rules need protection for server-owned description metadata.
- Existing Firestore vehicle updates are not transactional. Description commits must compare revision and generated input data inside a transaction before writing aliases and history.

## Implementation contract

One `masterDescription`, mirrored into `description` for existing consumers. Draft generation happens server-side after a debounce, at most once automatically per form session; manual text is never automatically replaced. Generated drafts carry user/tenant attribution, input fingerprint, provider usage and expiry. Saving vehicle data atomically commits description metadata and immutable versions. Significant data changes increment the revision and mark review. Legacy text is preserved, including explicitly blank master text.

Admin controls use a dedicated section of the existing AI settings page and a server-only configuration document. Rollout is fail-closed with environment, internal-user and selected-tenant scopes. Existing membership checks remain mandatory. Visual findings remain suggestions until explicitly confirmed. Social publication uses the current saved master text and never edits historical posts.

Required validation: confirmed VIN/no-VIN facts, omitted unknowns, manual text, regeneration, restoration/history, price/mileage review, social equality, provider errors, tenant/ownership authorization, legacy migration, concurrent commits and stale generation responses; browser create/edit flows for both portals. Production enablement follows successful verification, not an unconditional global activation.

Official provider reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Delivery and verification — 2026-09-28

- Dealer, seller, public website and admin App Hosting builds succeeded and their production health/settings endpoints responded successfully. Firestore rules were deployed.
- 49 automated description, VIN/OCR, equipment and marketing tests passed, plus a regression test for the Functions runtime's named Firebase app. Three Firestore emulator tests cover transactions, permissions and legacy reconciliation. The browser editor harness passed automatic generation, manual preservation, confirmation, restoration, failure and late-response checks.
- The production migration copied all 38 existing descriptions exactly into `masterDescription`, preserving the old field, creating private history/audit and recording the confirmed-fact fingerprint. A subsequent dry run found zero pending records. To run on another environment, build with `node functions/build-vehicle-description.js` before invoking the migration; it defaults to read-only.
- Older mobile clients continue writing `description`; the authenticated Firestore event bridge reconciles both aliases and records private history without invoking AI. Production verification exposed a named-app initialization problem; the handler now explicitly selects or initializes the default app and passes it into Firestore.
- The real configured OpenAI credential returned HTTP 429 with `credit_balance_exhausted` / `insufficient_quota`. Full real-provider acceptance remains blocked until API credit is available. The global feature configuration remains disabled; internal test configuration is restored after each production test. No API secrets are exposed or logged.
- The existing smoke dealer has no active membership, and production correctly rejects vehicle creation for that account. Edit/history/social checks use an explicitly hidden temporary fixture, then remove it; no paid membership or historical social post is changed. This does not count as a successful production creation test for an entitled dealer.
- Visual feature suggestions are stored privately and require explicit confirmation. The integration point is prepared; automatic photo analysis is not connected to a vision provider in this release.
- Final production smoke passed after the bridge correction: private legacy creation, price-change review without overwriting text, manual edits, concurrent 200/409 conflict handling, immutable history and restoration, Facebook/Instagram preparation reading the saved master despite forged input text, live legacy update reconciliation, and anonymous/out-of-scope rejection. Temporary fixture cleanup and global configuration restoration completed successfully. No real social post was published by the test.
- The public catalog returned five vehicles; all five exposed identical master and legacy description values. This is API verification, not a substitute for a successful funded-provider generation test or an entitled-dealer production creation test.
