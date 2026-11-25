# Vastgoed

A Ghost theme and browser-only real estate client powered by Nostr. Ghost hosts the site and editorial guides; listings are signed Nostr events, not Ghost posts. Node.js 22+ and Ghost 5.130+ or 6+ are required.

## Shared Branding And Link Previews

- The house/key mark and favicon are shared with Vastgoed.org, while the wordmark remains `vastgoed.net`. Assets are served locally from `assets/images/`, including the dark/light current-color logo mask, SVG favicon, and 180px touch icon. No logo or font request depends on the other domain.
- The public application templates render their own title, description, canonical, Open Graph and Twitter tags on the server. A 1200 x 630 PNG preview card replaces the stock publication cover and generic tagline. This works for crawlers without JavaScript and contains no invented listing counts or properties.
- Application metadata uses `ghost_head` exclusions for `metadata,social_data,schema`, preserving native integration scripts without competing metadata. This requires a recent helper implementation; the declared minimum is Ghost 5.130. Earlier Ghost 5 releases are not supported by this override.
- Editorial posts, pages and author/tag archives retain their native CMS metadata so per-article SEO and feature images are not overwritten. Set the publication title, description, logo, icon, and social accounts in site settings to match Vastgoed.net as well, particularly for RSS and editorial fallbacks. Remove default social-account handles and avoid injecting a second metadata set through code injection.
- Listing and profile links receive branded application-shell previews, not property-specific server-rendered previews: Nostr content is still fetched in the browser. Individual listing social cards require server-visible listing data in a future integration.
- After deployment, verify the raw page source and `https://vastgoed.net/assets/images/social-preview.png`. Social platforms may retain earlier previews until their cache is refreshed or the URL is re-scraped.
- To regenerate the checked-in PNG assets from the authored SVG and shared favicon, install Playwright Chromium and run `npm run generate:brand`. Normal builds reuse the committed assets and do not require this image-generation step.

## Public Property Search

- Search and map come first, without a marketing hero. Live counts show matching properties, active listings loaded from relays, and properties with map coordinates. Counts are not market-wide inventory totals.
- Desktop and mobile start with a full-width Europe map and listing cards below it. List and Split alternatives remain available. The map does not jump to overseas listings when data loads. Pins retain their geographic positions through zoom, pan, and layout changes.
- Advanced filters include country, currency, price, bedrooms, and price period. Price ranges require a currency and period; selecting Buy implies one-time pricing. Weekly and monthly rents are never converted or compared as equivalent amounts.
- Free-publishing calls to action open the editor immediately, without an email signup, npub lookup, or extension connection. Vastgoed charges no listing fee; independent relay and media providers may charge for their services.
- The newsletter section uses Ghost's native confirmed-email membership form. Signed-in members see account preferences, invitation-only/disabled memberships have appropriate alternate states, and local preview explicitly does not create subscriptions.
- Map code is loaded only for views that need it. Broken property photographs fall back to a clearly labeled placeholder rather than substituted sample properties.

## Local Preview

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/` for search, `/guides/` for how it works, or `/dashboard/#editor` to start a free listing. Vite also supports `?page=dashboard`, `?page=listing&address=...`, and `?page=profile&pubkey=...`. Local preview does not create memberships. Existing listings can be fetched with an npub; publishing uses a matching extension or an explicitly generated temporary key. Never enter an existing private key into the site.

## Free Publishing And Keys

- Start with property details and photographs before choosing an identity. Selected JPEG, PNG, and WebP files are staged locally, with a maximum of twelve photographs of up to 20 MB each. Local drafts can explicitly save the fields and photo Blobs in IndexedDB.
- Choose a NIP-07 browser extension or explicitly generate a new key pair. Either choice preserves the composed listing. Existing listings cannot be reassigned to a new key.
- Generated keys use the cryptographic random generator in `nostr-tools`. The private key stays in a closure in memory, never in application storage, HTML, relay events, upload requests, or logs. Composer identities are not restored as account sessions after reload.
- Before a generated key can authorize uploads or publish, download the plaintext private-key backup and acknowledge that it has been saved. Protect this file: anyone with its nsec controls the identity. A membership cannot recover it. To manage listings later, import the backup into a trusted external Nostr extension and connect that extension here; this site has no nsec-import field.
- Reloading, navigating away, or disconnecting clears the active generated signer. Download URLs are revoked, the key buffer is overwritten, and further signing with that instance is blocked. Browser-memory signing is more exposed to compromised site scripts than an isolated extension; use a trusted extension for ongoing management.
- Public Blossom uploads require signing authorization. Anonymous photo selection is local, not an unauthenticated public upload. After choosing a signer, upload explicitly or use Sign and publish to upload pending files and then publish the listing. Uploaded photos are public even if listing publication fails or is cancelled. Re-encoding strips EXIF metadata; review visible image content for private information.

## Languages

- The interface supports Dutch, French, German, and English, covering Belgium's three official languages and Dutch for the Netherlands, with English as an international fallback.
- Small inline SVG flag controls appear in the header menu and client sidebar, with native language names for accessibility, keyboard focus, and selected-state feedback. An explicit `?lang=nl`, `?lang=fr`, `?lang=de`, or `?lang=en` takes precedence over the saved preference, then browser languages are used. Regional codes such as `nl-BE`, `nl-NL`, `fr-BE`, and `de-BE` are recognized.
- Selection persists in local storage where available. Internal interface links preserve the chosen language; switching does not reload the page or reset form values, filters, or drafts. Currency, dates, and property facts use the selected locale.
- Publisher-authored titles, descriptions, locations, profiles, and Ghost editorial content are not automatically translated. Original listing text is deliberately preserved. The interface uses local translation catalogs, not a third-party translation service.
- Ghost Portal, confirmation emails, and newsletter content retain Ghost's own language/content configuration. Translating the theme is not automatic translation of Ghost-hosted emails or separately authored publications.

## Dashboard Client

- The dashboard is a dedicated sidebar application, without the public site's marketing hero. Desktop navigation stays on the left; mobile uses a slide-out drawer.
- Enter an npub or connect your extension to open My Listings. Account switching clears the active identity and opens the account selector again.
- Profile and NIP-65 metadata are fetched first. Existing kind `30402` listings are fetched by author from advertised write relays and browser/default fallback relays, without requiring a Vastgoed tag or origin. Public search remains restricted to real estate-tagged events.
- Discovery is bounded to twelve relay sources, with up to 300 listing events per source. Coverage reports distinguish returned events and failed requests, but empty responses can also represent timeouts or access restrictions.
- Select an existing property to open its populated editor. Signed edits keep the author and `d` identifier, and are sent to advertised write relays as well as browser publishing relays. Merely entering someone else's npub cannot authorize publishing.
- Preview listing opens a local, unsigned property preview with the same gallery and detail layout as the public page. It does not sign or publish an event, and closing it preserves the editor. Published listing pages show actual event provenance separately from publisher identity and do not claim verified property ownership.
- The Newsletter section at `/dashboard/#email` is accessible without a Nostr identity. It offers membership/newsletter signup, sign-in, or preferences according to the site's enabled, invitation-only, and signed-in states. The original server-rendered form is moved, not cloned, so CMS-bound listeners and form state survive navigation. Public wording is branded Vastgoed/membership, not the underlying CMS. The local preview never sends signup data or pretends to create an account.
- Sidebar sections are directly addressable: `/dashboard/#listings`, `#profile`, `#relays`, `#media`, `#email`, and `#editor`. Drafts remain device-local. Navigating between sections keeps the current form mounted; refresh/account switching reloads it.

## Build And Deploy

```sh
npm run build
npm run check:theme
npm run package
```

`build` type-checks and builds browser assets. `package` also builds and creates `dist/vastgoed.zip`.

1. Upload and activate `dist/vastgoed.zip` in Ghost Admin's theme settings.
2. Upload the repository's `routes.yaml` separately in Ghost Admin's routing settings. Back up and reconcile existing routes before replacing them.
3. Verify `/` (search), `/dashboard/`, `/listing/?address=...`, `/profile/?pubkey=...`, and `/guides/` on the deployed site.
4. Configure Ghost Portal and membership separately if offering email signup. Publisher+ uploads require a Ghost hosting plan that permits custom themes; verify current plan capabilities with your host.
5. Configure and monitor the report mailbox `hello@vastgoed.net`, or change the report destination before launching your own deployment. The current report action opens the visitor's email client; there is no server-side report queue.

### Production Acceptance

The generated theme ZIP is a deployable build, not proof that a hosted installation and third-party providers are configured correctly. Before public launch:

- Confirm the custom domain, HTTPS, theme ZIP, routing file, Ghost publication metadata, and social sharing image on Ghost(Pro).
- Enable and configure Ghost memberships, newsletter sending, consent/privacy information, and unsubscribe behavior. Test a real signup and confirmation email, existing-member preferences, invalid addresses, and error states. Do not describe the newsletter as automated listing alerts; those are not implemented.
- Test real NIP-07 approve/reject flows, listing updates on the author's write relays, and Blossom authentication, CORS, retention, and quotas. Test map-provider availability from supported browsers and regions.
- Publish the policies and contact details appropriate to the business, including the privacy implications of public Nostr data, image hosts, relays, and map requests. Confirm the reporting mailbox is monitored.
- Review listings for scams and ownership claims. Neither a valid Nostr signature nor a real estate tag verifies property ownership. There is no central moderation backend in this browser-only release.
- Accept the documented browser-only discovery and listing SEO limitations. Dynamic Nostr listings do not get dedicated server-rendered Ghost metadata, social previews, or a property sitemap automatically.

GitHub Actions runs unit/browser tests, builds the upload ZIP, validates Ghost 5/6 compatibility, and saves the theme artifact. After validation succeeds on `main`, the deployment job downloads that exact artifact and uploads `dist/vastgoed.zip` using the repository Actions secrets `GHOST_ADMIN_API_URL` and `GHOST_ADMIN_API_KEY`. Pull requests and other branches cannot deploy. Manual workflow runs on `main` can also deploy.

The deployment action uploads the theme but does not activate it. Activate `vastgoed` in the site's theme settings after the first successful deployment. Upload `routes.yaml` separately; theme deployment does not change routing. Never commit the Admin API Key. Live email and provider acceptance checks remain manual.

## Browser Tests

```sh
npx playwright install chromium
npx playwright test
```

`I18N_BROWSER_TESTS=1 npm test` additionally runs the translation engine's opt-in real-DOM regressions. CI enables these after installing Chromium. Full browser coverage also includes language precedence, original-content preservation, localized prices, gallery dialogs, unsigned previews, and Ghost-form listener preservation; mocked forms are not a substitute for hosted Ghost acceptance testing.

Playwright starts Vite on port 5173, reusing an existing server outside CI. The Chromium tests intercept every `wss://` connection, answer Nostr `REQ` messages with matching signed fixtures and `EOSE`, and acknowledge valid published events with `OK`. A mocked NIP-07 bridge signs using real ephemeral keys in Node, never in page storage. External HTTP requests, including map tiles, are aborted for deterministic runs; a map warning is expected and does not prevent listing search.

Coverage includes npub-only discovery from an author's advertised write relay, importing an existing listing without Vastgoed tags, signed edits preserving its address, sidebar/hash navigation, account switching, mobile drawer behavior, anonymous access, lost-acknowledgement recovery, profile metadata preservation, local drafts, public search and HTML escaping, and mocked Blossom uploads. Failure traces are retained. These tests do not establish live provider availability, hosted Ghost behavior, real extension permissions, or live upload compatibility.

Run `npm test -- src` for the existing unit tests, restricting Vitest to `src` so it does not collect the Playwright specs. Before release, manually validate a real NIP-07 extension's connect, approve, reject, edit and publish flows; real relay acknowledgements and retrieval; Blossom uploads and CORS; Ghost routes and Portal; and report email delivery.

## Scope And Limits

- The app is browser-only. There is no backend index, server-side identity verification, or verified email-to-npub pairing. Membership cannot sign or manage Nostr listings.
- Drafts are saved only in this browser/device, including guest drafts and explicitly saved photographs. They are not synced and can disappear when browser storage is cleared. Disconnecting does not remove local drafts. Private signing keys are never included in drafts.
- Dashboard lookup public keys may be remembered in tab session storage, not as proof of ownership. Guest-composer signing identities are memory-only; published events still contain their public author key in the ordinary public-event cache. Mutations require a matching extension signature or the backed-up active generated signer.
- Search is limited discovery, not a global property index. Filters operate only on loaded listings. Public relay retention, access policies, limits, and timeouts can omit properties; an empty response does not prove that none exist.
- The in-memory/browser cache retains up to 5,000 ordinary events; observed deletion requests are retained separately from that cap so old listing copies stay suppressed. Deletions not returned by connected relays can still be missed. Discovery requests up to 150 events per relay per batch, follows at most 80 authors for address updates, and permits at most eight configured relays. Load more or refresh for additional discovery, without a completeness guarantee.
- The map uses supplied coordinates or supported geohashes and displays up to 300 geographically mappable filtered listings. Map-area filtering applies only to loaded listings, not a geographic relay query.
- Standard NIP-99 `g` geohashes are supported as approximate map locations when explicit coordinates are absent. Pins for these listings represent the geohash cell center, not an exact property address. New listings with coordinates include both explicit coordinate tags and a geohash.
- Default public relays are `relay.damus.io`, `nos.lol`, and `relay.primal.net`; the default Blossom server is `https://blossom.primal.net`. Map tiles use OpenFreeMap / OpenStreetMap. These public providers are not guaranteed to remain available, free, compatible, or willing to retain this content. Session publishing/read relays and public discovery settings are distinct. Future deployments can operate their own relays, media servers, and discovery infrastructure; none are bundled here.
- Listings use NIP-99 kind `30402` with stable `d` identifiers and a `t=real-estate` discovery tag; discovery also recognizes `realestate` and `property`. `location` and active/sold status are NIP-99 fields. The `vastgoed_schema` version tag and property-specific tags such as `country`, `transaction`, `property_type`, `latitude`, `longitude`, and rented/withdrawn statuses are application conventions, not universally supported standards. Other clients may interpret or omit them differently.
- Descriptions, including Markdown, are currently rendered as plain text intentionally for safety. Arbitrary HTML is not rendered.
- Listings, profiles, contact details, images, and exact coordinates are public. A signature proves control of a key, not property ownership or a trustworthy seller. Deletion requests cannot guarantee network-wide removal. Verify publishers and properties independently.
