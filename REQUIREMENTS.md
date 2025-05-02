# CitizenX

A decentralized Chrome extension for annotating websites in order to bring a knowledge layer on top of the internet.

## Requirements - v1.0
1. We want the user to be unique and the same if he changes device, clears his browser data, or loses his device.
   - **Status**: Implemented. Users authenticate via a DID, stored in `chrome.storage.local` and Gun.js (`user_<did>`). The `currentDID` is cached in `localStorage` for persistence on the same device, with import/export functionality for cross-device use.
   - **Advanced User Support**: Advanced users can deploy their own Gun.js server and set it as their "primary server" via the settings menu (⚙️ icon), storing the URL in `user_<did>/primaryServer`. The extension prioritizes this server for their data interactions.
2. We want the user to have a profile picture and a handle.
   - **Status**: Implemented. Users can create profiles with a handle and profile picture, stored in Gun.js (`user_<did>/profile` and `profiles` nodes). Profiles are included in the import/export process.
3. We want pages from different languages and with non-functional parameters (like UTM parameters) to be considered the same page.
   - **Status**: Implemented via `normalizeUrl` in `src/shared/utils/normalizeUrl.ts`, which removes UTM parameters and normalizes URLs.
4. We want the Chrome extension to maintain a list of the history of pages visited by the user.
   - **Status**: Pending.
5. We want the user to be notified through the extension when annotations are made by someone else on the pages he visited.
   - **Status**: Pending.
6. We want the user to be notified through the extension when comments are made on his annotation.
   - **Status**: Pending.
7. We want the comments to be a thread under the annotation.
   - **Status**: Implemented. Comments are stored as sub-nodes in Gun.js (`annotations/<url>/<annotationId>/comments`) and displayed as a thread under each annotation.
8. We want the persistence to be decentralized using IPFS.
   - **Status**: Partially implemented. Shifted to Gun.js for decentralized storage, which can integrate with IPFS in the future. Currently using a single Gun.js node on Render, with persistence pending a paid plan upgrade or pinning service.
9. We want the notifications and other collaborative features to not rely on a centralized server.
   - **Status**: Partially implemented. Gun.js provides decentralized storage, but notifications are pending. The Render server is a single point of failure until a pinning service or multi-node setup is implemented.
   - **Sharding and Replication**: Designed domain-based sharding (`annotations_<domain>`) with peer-to-peer replication (minimum factor of three), ensuring servers only replicate relevant shards while maintaining availability.
10. We want users to share annotations on social media (e.g., Twitter, Facebook), messaging platforms (e.g., WhatsApp), or other channels to attract new users. The sharing mechanism should optimize for social media reach by including engaging text or images (e.g., annotation snippets or screenshots) while providing a link that first checks if the CitizenX extension is installed. If installed, the link navigates to the annotated page; if not, it directs to an installation page (e.g., Chrome Web Store or CitizenX website).
    - **Status**: Implemented. Users can share annotations via a custom share modal (macOS) or `navigator.share` (other platforms). The link (`https://citizenx.app/check-extension?annotationId=<id>&url=<encoded-url>`) redirects appropriately based on browser and extension presence. URL shortening was considered but deferred.
11. When a user clicks an annotation sharing URL on a browser that cannot install the Chrome extension (e.g., mobile browsers, Safari, Firefox), they should be redirected to a page on `https://citizenx.app` that displays the annotated page’s URL as a clickable link (opening in a new tab). This page should reuse the extension’s UI, DID, and existing code to allow viewing and interacting with annotations on the website, mimicking the extension’s functionality.
    - **Status**: Implemented. The `/view-annotations` page displays annotations, with a clickable link to the annotated page (opens in a new tab). Styled to match the CitizenX design (white `#fff`, teal `#2c7a7b`, Inter font), with a loading spinner.
    - **Mobile Detection**: Added a mobile check (`/android|iphone|ipad|ipod|mobile/i.test(userAgent)`) in `check-extension.js` to redirect mobile browsers (e.g., Chrome on Android) to `/view-annotations`, as they cannot install extensions.
    - **Author Display Fix**: Fixed an issue where authors were displayed as "Unknown" by updating the `/api/annotations` endpoint on the Render server to fetch user profiles from Gun.js with retries (up to 5 attempts) and in-memory caching (5-minute TTL), ensuring the correct `authorHandle` is included in the response.
12. Both on the annotation feature under 11 and on the sharing functionality, provide a screenshot of the top of the page being annotated (I guess store it along the annotations but only once).
    - **Status**: Pending.

## Non Functional Requirements - v1.0
1. Except for the Chrome Extension, we want zero installation on the user's device.
   - **Status**: Met. No additional installations are required beyond the extension.
2. We want it 100% serverless, storing data on IPFS.
   - **Status**: Partially met. Using Gun.js for decentralized storage, with a single node on Render. IPFS integration is planned for future versions.
3. We want the authentication to also be decentralized.
   - **Status**: Met. Authentication uses DIDs stored in Gun.js (`user_<did>`).
4. We want to ensure as much as possible zero loss of data in case of network issues or other failures.
   - **Status**: Partially met. Data is stored in Gun.js, with a replication factor of three across servers (user-deployed, pinning service). Persistence requires a pinning service or Render paid plan upgrade.
5. We want the Chrome extension to be minimal in terms of content, with all code bundled locally to comply with Chrome Web Store policies (updated from serving content from a `github.io` page, which is not allowed).
   - **Status**: Met. All code is bundled locally using Vite.
6. We want to secure the JWT tokens and other access technologies against hacking.
   - **Status**: Not applicable for JWT tokens (not used). Implemented security for annotations:
     - Signed annotations and write requests to prevent unauthorized changes.
     - Immutable versioning with tombstones for deletions.
     - Protection against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks through signature verification, rate-limiting, timestamp checks, and logging.
7. Add privacy policy to manifest.json once we have a website: "privacy_policy": "https://yourwebsite.com/privacy-policy"
   - **Status**: Pending. Awaiting website and `manifest.json`.

## Requirements - Future Versions
1. We want a crypto/ledger-based ownership structure for the project.
2. We want a crypto-based system for paying contributors, users (if there is profit), and any other connected systems as needed.
3. We want a system allowing users to share annotations on social platforms, messages, and emails for growth hacking.
   - **Status**: Implemented in v1.0 (Req 10).
4. We want to enrich annotations with structured data, allowing complex reasoning on them.
5. We want to use a WYSIWYG editor for annotations (but not comments).
6. We want an AI-powered feature to extract structured information from annotations and comments, defined in a JSON format shared between users. Users can create their own extraction schemas, suggest schemas to the community, and the community can vote to adopt schemas if there’s sufficient interest.

## Non Functional Requirements - Future Versions
1. Add a pinning service—most probably our own but distributed among willing users, incentivizing them in a crypto-based way.
   - **Status**: Planned. Needed for Gun.js to ensure data persistence. Will replicate shards to reliable nodes, contributing to the replication factor of three, and improve performance by increasing data availability.
2. Restructure the Gun organization so that not every user replicates all annotations from the whole world, but only those from pages they visited (or visit now) and pages they annotated.
   - **Status**: Designed. Use domain-based sharding (`annotations_<domain>`), with servers replicating only relevant shards. Advanced users’ servers prioritize their `primaryServer` for these shards.
3. Ensure compliance with Chrome Manifest V3 requirements:
   - Use `background.service_worker` instead of persistent background pages, adapting to the service worker lifecycle (e.g., stateless design, persistence via `chrome.storage`).
     - **Status**: Met.
   - Avoid `eval`, `new Function`, and other dynamic code execution methods.
     - **Status**: Met.
   - Define a strict Content Security Policy (CSP) in `manifest.json` (e.g., `script-src 'self'; object-src 'self'`), prohibiting inline scripts and external code fetching.
     - **Status**: Assumed met (pending `manifest.json`).
   - Use the `action` API for toolbar interactions (replacing `browserAction` and `pageAction`).
     - **Status**: Assumed met (pending `manifest.json`).
4. Minimize permissions to reduce user friction and comply with Chrome Web Store policies:
   - Use specific `host_permissions` where possible, avoiding broad permissions like `<all_urls>` unless necessary.
   - Implement optional permissions (`optional_host_permissions`) to allow users to grant access to specific domains on-demand.
   - Provide clear justifications for all permissions in the Chrome Web Store listing.
   - **Status**: Pending review of `manifest.json`.
5. Optimize performance to avoid degrading the browser experience:
   - Design service workers to handle termination after 30 seconds (or up to 5 minutes for certain APIs), using `chrome.storage` for state persistence.
     - **Status**: Met.
   - Optimize content scripts by using `run_at: "document_idle"` and limiting DOM manipulation.
     - **Status**: Assumed met (pending confirmation).
   - Keep the extension bundle size under 100 MB (compressed) and 200 MB (uncompressed), leveraging tree-shaking with Vite.
     - **Status**: Met.
   - **Annotation Loading Optimization**: Identified slow annotation loading (~10 seconds) on both web and extension UIs. Proposed reducing timeouts (from 5s to 1s in `gun-server.js`, 2s to 500ms in `GunRepository.ts`), batching profile fetching, caching annotations locally, increasing peer availability, and optimizing Gun.js data access to reduce fetch times to ~2-3 seconds.
6. Enhance security to protect users and comply with Chrome policies:
   - Use HTTPS for all network requests (e.g., fetching data from `github.io`).
     - **Status**: Met (shifted to local bundling).
   - Sanitize user input (e.g., annotations, comments) to prevent XSS attacks, using a library like DOMPurify.
     - **Status**: Pending.
   - Avoid broad permissions that could lead to security concerns or user distrust.
     - **Status**: Pending review of `manifest.json`.
7. Ensure a good user experience to avoid user frustration and Chrome Web Store flags:
   - Use non-intrusive UI elements (e.g., side panel, `chrome.notifications`) instead of popups or alerts.
     - **Status**: Met.
   - Support internationalization (i18n) using Chrome’s `i18n` API if targeting a global audience.
     - **Status**: Pending.
   - Ensure accessibility (a11y) in the UI (e.g., ARIA attributes, keyboard navigation).
     - **Status**: Partially met (added `aria-label` to `/view-annotations` link).
8. Prepare for Chrome Web Store review process:
   - Avoid obfuscated or unreadable code, providing source maps if minification is used.
     - **Status**: Met.
   - Clearly document data sharing (e.g., via Gun) in the privacy policy and obtain user consent if necessary.
     - **Status**: Pending privacy policy.
   - Ensure the extension provides meaningful functionality and avoids unexpected behavior (e.g., no ads, no unauthorized tracking).
     - **Status**: Met.
9. Manage storage limits for scalability:
   - Request the `unlimitedStorage` permission if large data storage is needed (e.g., for annotations in `localStorage`).
     - **Status**: Not needed (shifted to Gun.js).
   - Offload data to Gun for peer-to-peer storage, ensuring data is pinned to prevent loss.
     - **Status**: Partially met (pending pinning service).