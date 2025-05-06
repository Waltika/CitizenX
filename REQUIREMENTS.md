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
- **Sharding (Scalability)**:
    - Implement domain-based sharding (`annotations_<domain>`) in Gun.js to distribute annotations across nodes based on the domain of the annotated page, reducing load on individual nodes.
    - Add sub-sharding for high-traffic domains (e.g., `annotations_google_com_shard_0`) by hashing the full URL and distributing annotations across shards.
    - Update `AnnotationManager.ts` to fetch and save annotations from/to the appropriate shard based on the normalized URL.
    - Test sharding with simulated high-traffic scenarios (e.g., 10,000 annotations on `google.com`) to ensure performance and data consistency.
    - Explore multi-node setups or pinning services (e.g., a custom pinning service with incentives, as planned in Non-Functional Requirement 1 - Future Versions) to enhance persistence and replication.
- **Security**:
    - Prevent hacking of the `gun-server` by securing API endpoints (`/api/annotations`, `/api/comments`):
        - Implement rate limiting in `gun-server.js` to prevent DoS attacks, using Gun.js `rateLimits/<did>` to track requests per user.
        - Enhance CORS security by setting a strict CORS policy (e.g., `Access-Control-Allow-Origin: https://citizenx.app`).
        - Sanitize user inputs (annotations, comments) to prevent XSS attacks using a library like DOMPurify in `useAnnotations.ts` and `gun-server.js`.
    - Ensure only owners of annotations/comments and admins can delete them:
        - Extend the existing signature verification in `AnnotationManager.ts` to check the requester’s DID against the `author` field for delete operations.
        - Define an admin role in Gun.js (`admins/<did>`) with a list of trusted DIDs, allowing admins to delete content after community consensus.
        - Update `writeRequests` to include delete operations, ensuring servers verify ownership or admin status before applying deletions.
    - Test security measures by simulating attacks (e.g., unauthorized deletion attempts, XSS injection, DoS attacks) and verifying that protections hold.

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
- **Lightweight Client-Side JS**: Include minimal client-side JavaScript (e.g., an inline