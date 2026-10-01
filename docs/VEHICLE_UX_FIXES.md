# Vehicle creation, public hero, catalog and support corrections

## Changes

- Dealer and seller vehicle creation use a shared photo-order control. Arrows support touch/keyboard and drag supports desktop. The ordered `File[]` is passed to the existing sequential upload; its first image remains the cover. Seller editing also exposes ordering for newly selected files.
- Support entry validates the existing support token, then stores it in sessionStorage for that tab. Client API requests prefer that token, including legacy raw fetch callers. Firebase token refresh cannot replace support identity. Seller server authentication honors the explicit Authorization header before any shared browser cookie. Exit ends the authenticated support session without clearing another tab's navigation cookie. Existing server roles and session validation remain authoritative.
- The public shared hero displays photos and native videos using `object-contain`, with heights of 240px on mobile, 320px on small screens and 360px on desktop. Embedded players use the same bounded viewport. Text is below the media; there is no dark overlay.
- The seller catalog uses the existing make/model-family grouping helper, with separate model rows. Dealer public inventory adds a model selector that resets when the brand changes.
- VIN text scanning serves its worker, WebAssembly and language model from the same portal. It uses sparse-text segmentation for labels, autofocus when supported, initialization progress and reading feedback. Two matching confident frames remain required; cancellation and timeout release the camera. An experimental fast language model failed the recognition check and was replaced by the accurate model before release.

## Verification

- 5 support isolation tests: independent tabs, stale cookies/Firebase tokens, same-origin-only credential forwarding, and independent session exit.
- 10 VIN extraction/camera lifecycle tests passed.
- Browser OCR smoke passed for dealer and seller with all external HTTPS requests blocked. A synthetic camera carrying a known VIN was read by the actual OCR engine, triggered lookup once, and released the camera. This does not replace testing physical labels with the user's phone and lighting conditions.
- Browser photo controls passed mobile arrow ordering, desktop drag ordering and cover selection.
- Browser hero checks passed mobile/desktop sizing, complete media containment, embedded viewport and absence of dark overlays.
- Model grouping test passed multiple models in one make, trim grouping and preservation of every vehicle.
- Type checking found no new errors; the dealer layout's two existing React.createElement children diagnostics and the public catalog's existing trust-gallery union diagnostic remain outside the changes. Seller changed files have zero diagnostics.
- Production rollout and final live account/hero checks are recorded after completion.
