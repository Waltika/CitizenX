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
    - **SSR Limitation**: The `/view-annotations` endpoint currently fails to render due to `AnnotationList` using React hooks (`useState`), which are not supported in server-side rendering. A temporary workaround was implemented by creating `AnnotationListServer.tsx`, but this refactoring was reverted to focus on scalability and security.
12. Both on the annotation feature under 11 and on the sharing functionality, provide a screenshot of the top of the page being annotated (I guess store it along the annotations but only once).
    - **Status**: Pending.

**Focus for Next Sprint**:
- **Scalability**: Optimize Gun.js peer connections for faster real-time updates, implement server load monitoring on Render, and explore multi-node setups or pinning services to handle increased user load.
- **Security**: Secure JWT secrets with environment variables, sanitize user inputs (annotations, comments) to prevent XSS, implement rate limiting on API endpoints (`/api/annotations`, `/api/comments`), and enhance CORS security.

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
   - **Status**: Implemented. Used Quill.js for WYSIWYG editing in annotations, with toolbar options for bold, italic, underline, lists, and links. Comments remain plain text.
6. We want an AI-powered feature to extract structured information from annotations and comments, defined in a JSON format shared between users. Users can create their own extraction schemas, suggest schemas to the community, and the community can vote to adopt schemas if there’s sufficient interest.
7. We need to find a solution for deployment between the server and the annotation extension because of the difference in time to deploy between our own server and the extension that needs to go through the Google Extension Store.
   - **Status**: Pending.
8. At some stage, we need to discuss how to structure the project so that all functionalities of the extension version are also available on the web version from the same code base but without having bloated JavaScript running on the client side (so having the node rendering happening on the server and lightweight JavaScript on the website).
   - **Status**: Planned. See "Reusing Node.js Code for SSR on the Website" for details.

### Comment Collapsing Mechanism
- **Description**: Add a collapse/expand mechanism to the comments section under each annotation to save space. Display comments collapsed by default with a toggle button (e.g., "+ Show X comments" to expand, "− Hide comments" to collapse).
- **Implementation Details**:
  - Added state management in `AnnotationList.tsx` to track the collapsed/expanded state for each annotation’s comments.
  - Implemented a toggle button above the comments section, visible only if there are comments.
  - Styled the toggle button in `AnnotationList.css` to match the UI’s design (teal color `#2c7a7b` with hover effect `#4a999a`).
- **Status**: Completed.

### Reusing Node.js Code for SSR on the Website
**Description**: To support rendering annotations on the website (`https://citizenx.app`) for non-Chrome browsers (Requirement 11), we plan to reuse the Node.js code from the Chrome extension's side panel (e.g., `useAnnotations.ts`, `useStorage.ts`, `AnnotationList.tsx`) as the Node.js backend for server-side rendering (SSR) on the website server (`gun-server.js`). The goal is to render the `AnnotationList` component on the server, minimizing client-side JavaScript while maintaining the same UI and functionality as the extension.

**Plan**:
- **Shared Library**: Extract common logic and components (e.g., `useAnnotations.ts`, `useStorage.ts`, `AnnotationList.tsx`, `AnnotationUI.tsx`, `Comment.tsx`, `types/`, `shared/utils/normalizeUrl.ts`, `styles/`) into a shared library (`@citizenx/shared`) that both the Chrome extension and website server can use. Use a monorepo structure (e.g., with `pnpm` workspaces) or publish the library as a private npm package.
- **Server-Side Rendering**:
  - Create a server-side version of `useAnnotations.ts` (`getAnnotationsServer.ts`) that fetches annotations and comments from Gun.js without React hooks.
  - Update `gun-server.js` to use `ReactDOMServer.renderToString` to render the `AnnotationList` component on the server.
  - Add a new endpoint `/view-annotations` to render annotations as HTML, passing fetched data as props to `AnnotationList`.
- **Lightweight Client-Side JS**: Include minimal client-side JavaScript (e.g., an inline script) to handle interactivity like toggling comments, ensuring compliance with Requirement 11’s goal of lightweight client-side JavaScript.
- **Testing**:
  - Test SSR on the website to ensure annotations render correctly with minimal client-side JavaScript.
  - Test the Chrome extension to ensure it works with the shared library.
- **Next Steps**:
  - Set up the monorepo or private npm package for the shared library.
  - Implement `getAnnotationsServer.ts` and the `/view-annotations` endpoint in `gun-server.js`.
  - Add minimal client-side JavaScript for toggling comments.
  - Test SSR and client-side interactivity.

**Status**: Planned. An attempt to implement this was made by creating `AnnotationListServer.tsx` for SSR and optimizing `AnnotationList.tsx` for client-side rendering, but it was reverted to focus on scalability and security (see "Separate Web and Extension Rendering for Scalability and SSR Compatibility" for details).

### Separate Web and Extension Rendering for Scalability and SSR Compatibility
**Description**: To address SSR compatibility issues in Requirement 11 (e.g., `TypeError: Cannot read properties of null (reading 'useState')` due to hooks in `AnnotationList.tsx`) and prepare for scalability, we explored separating the rendering logic for the web (server-side rendering via `/view-annotations`) and the extension (client-side rendering in the side panel). This involved creating `AnnotationListServer.tsx` for SSR and keeping `AnnotationList.tsx` for client-side use, with shared logic in `@citizenx/shared`.

**Rationale for Parking**:
- **User Traction Priority**: The current focus is on attracting early adopters by maintaining a stable, consistent user experience. The unified rendering approach, despite SSR limitations, is sufficient for early beta users.
- **Complexity vs. Benefit**: Separating web and extension rendering adds development overhead without immediate user growth benefits, as the app is in early beta and not yet facing scalability demands.
- **New Focus**: Resources are better allocated to improving scalability (e.g., Gun.js optimization, server load handling) and security (e.g., JWT secret management, input sanitization) to prepare for future growth.

**Future Version Target**:
- **Version 2.0 (Tentative)**: Revisit this refactoring when the app reaches a larger user base (e.g., 1,000+ active users) and requires optimized SSR for sharing annotations (e.g., via `/view-annotations`) and improved performance in the extension’s side panel.
- **Trigger for Implementation**: When user feedback indicates a need for faster sharing links (e.g., `/view-annotations` performance issues) or when the app scales to require separate optimization for web and extension contexts.

**Implementation Notes**:
- **Previous Work**: Implemented `AnnotationListServer.tsx` for SSR, updated `gun-server.tsx` to use it, and optimized `AnnotationList.tsx` for client-side rendering with dynamic CSS loading. Fixed data inconsistencies (e.g., `TypeError: w.comments is not iterable`) by adding `Array.isArray` checks and normalizing data in `GunRepository.ts`. Improved heartbeat handling in `background.ts` and ensured CSS loading in the extension. These changes were reverted to focus on scalability and security but can be restored from commit history.
- **Next Steps**: In Version 2.0, reintroduce `AnnotationListServer.tsx` and ensure both components share a consistent UI while optimizing for their respective environments (SSR for web, client-side for extension).
- **Dependencies**: Requires updated Vite configuration for CSS bundling in the extension and robust Gun.js data normalization to prevent data issues.

**Status**: Parked for Version 2.0.

### Implementing Decentralized AI for Moderation, Ranking, and Social Features
**Description**: To enhance the CitizenX app with moderation, ranking, and social features (e.g., recommending annotations, surfacing trending content, building user reputation systems), we plan to explore decentralized AI initiatives using machine learning. This aligns with the app’s decentralized ethos (using Gun.js) and can leverage community-driven data to train models for moderation (e.g., flagging inappropriate content), ranking (e.g., prioritizing high-quality annotations), and social features (e.g., personalized recommendations).

**Plan**:
- **Short-Term (Rule-Based Approach)**:
  - Implement rule-based moderation using keyword filtering to flag inappropriate content (e.g., hate speech, spam) in annotations and comments.
  - Add a basic ranking system based on community feedback (e.g., sorting by upvotes).
  - Introduce a reporting system where users can flag content, reviewed by trusted moderators.
- **Long-Term (Decentralized AI)**:
  - **Moderation**: Use federated learning to train a decentralized AI model for content moderation on user devices, sharing model updates via Gun.js. Explore initiatives like Pundi AI’s decentralized data annotation platform to mitigate bias through community participation.
  - **Ranking**: Implement a decentralized reinforcement learning (RL) model to rank annotations/comments based on user engagement (e.g., upvotes, views). Distribute the RL model across the Gun.js network, using a blockchain for transparency and consensus.
  - **Social Features**: Use decentralized collaborative filtering for recommending annotations, trained on user behavior (e.g., viewed annotations, upvotes). Build a reputation system with AI to assign scores to users, validated by community consensus.
- **Research**: Investigate decentralized AI projects like OpenledgerHQ, NousResearch (raised $50M for decentralized AI on Solana), and Pundi AI to understand best practices and potential integrations.
- **Integration with Shared Library**: Extend the shared library (`@citizenx/shared`) to include decentralized AI components, ensuring both the Chrome extension and website server can leverage these features.
- **Testing**:
  - Test the rule-based system to ensure it catches basic inappropriate content and ranks content effectively.
  - Test decentralized AI models for accuracy, fairness, and performance on the Gun.js network.
  - Evaluate user experience with recommendations and reputation systems.
- **Challenges**:
  - Resource constraints: Federated learning may be slow on low-end devices.
  - Data quality: Community-provided data may be noisy, requiring curation.
  - Sybil attacks: Prevent manipulation of rankings/reputation with robust identity verification (e.g., DIDs).
  - Gun.js integration: Extend Gun.js to support distributed computation for AI models.

**Status**: Planned, with short-term rule-based implementation to be prioritized soon, and long-term decentralized AI to be explored later.

## Non Functional Requirements - Future Versions
1. Add a pinning service—most probably our own but distributed among willing users, incentivizing them in a crypto-based way.
   - **Status**: Planned. Needed for Gun.js to ensure data persistence. Will replicate shards to reliable nodes, contributing to the replication factor of three.
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