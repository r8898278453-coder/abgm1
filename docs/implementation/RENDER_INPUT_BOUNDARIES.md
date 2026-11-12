# Render input boundaries — 12 November 2026 IST

This continuation hardens draft creative/reel inputs. It does not accept P05 or establish working video rendering on Hostinger.

Delivered together:

1. Creative and reel HTTP handlers extracted from server.ts into server/renderRoutes.ts with injectable creative dependencies. Existing paths and successful creative response fields remain compatible.
2. Explicit company ID and strict, bounded request objects; unknown fields and malformed colors rejected before rendering.
3. Canonical saved company name always wins over the legacy browser companyName field.
4. Explicit images must match a registered asset of the correct type belonging to that company.
5. Renderer images are read locally; arbitrary HTTP, data, foreign-client and traversal URLs cannot trigger a renderer fetch through these routes.
6. Real-path containment, company-directory symlink refusal, bounded five-MiB reads and PNG/JPEG/WebP signatures; SVG rejected. Signature checking is not full image decoding or a decompression-bomb guarantee.
7. Asset checks precede creative theme-history mutation. Saved brand colors have a safe hex fallback.
8. Neutral creative defaults; missing reel scenes no longer invent verified-team/results claims. Reel request requires exactly three bounded scenes.
9. Remote stock-photo fallbacks removed from the reel composition; absent owned images use the existing solid background.
10. Render routes classified as agency write operations, allowing assigned editors while retaining archive/role policy; private responses use no-store and fixed error codes.
11. Reel capability defaults off unless ENABLE_REEL_RENDERING=true. This flag is an experimental opt-in, not proof of hosting support. No environment variable was changed.
12. Frontend starts at pending/zero, rejects stale request results, stops on unavailable polling and reports unconfirmed completion. No viral-performance claim. Legacy memory cleanup timer no longer keeps the process alive.

Validation: renderInputPolicy.test.ts checks ownership, URL rejection, traversal, symlinks, bounds, raster signatures and request schemas; renderRoutes.test.ts checks loopback HTTP auth/scope, no pre-rejection render/theme effects, canonical identity, safe failure and disabled reel capability. Creative renderer is injected in HTTP tests; the fixture is explicitly not a real PNG. A separate actual Satori/Resvg smoke rendered a55,218-byte1080x1080 PNG without external images. Full103 regressions, TypeScript, build, route/doc checks and workspace-isolation Chromium passed. The workspace browser test covers existing isolation flows; it does not establish dedicated reel polling UI acceptance. No actual MP4, browser render capacity, provider delivery or production behavior is claimed.

Pending P05-07: asset approval/license provenance, approved fact/language/offer enforcement, artifact lifecycle and full library UI. Pending P05-09: replace the memory Map with durable existing SQL queue admission/status, idempotency, cancellation, restart recovery, lease fencing, actor/archive rechecks and measured cross-process CPU limits. Do not enable the experimental reel path for production before those are implemented and hosting capabilities verified. Even with opt-in, current jobs remain ephemeral and do not recover after restart. Existing marketing upload URLs remain public; these changes do not make generated marketing assets private. Legacy external or SVG asset references now require a supported local raster upload.

No migration: schema035_security_policy,63 tables; next036. No parent task or phase newly accepted. Billing excluded. No deployment, production DB write or provider send.
