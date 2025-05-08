# CitizenX

A decentralized Chrome extension for annotating websites in order to bring a knowledge layer on top of the internet.

## Requirements - v1.0

### Core Functionality
1. **Unique User Identity Across Devices**
   - **Description**: Ensure the user remains unique and consistent even if they change devices, clear browser data, or lose their device.
   - **Status**: Implemented. Users authenticate via a DID (Decentralized Identifier), stored in `chrome.storage.local` and Gun.js (`user_<did>`). The `currentDID` is cached in `localStorage` for persistence on the same device, with import/export functionality for cross-device use.
   - **Advanced User Support**: Advanced users can deploy their own Gun.js server and set it as their "primary server" via the settings menu (⚙️ icon), storing the URL in `user_<did>/primaryServer`. The extension prioritizes this server for their data interactions.

2. **User Profiles with Handle and Picture**
   - **Description**: Allow users to have a profile picture and a handle.
   - **Status**: Implemented. Users can create profiles with a handle and profile picture, stored in Gun.js (`user_<did>/profile` and `profiles` nodes). Profiles are included in the import/export process. Fixed an issue where author handles displayed as "Unknown" by improving profile fetching in `useAnnotations.ts` and updating the `/api/annotations` endpoint to fetch profiles with retries and caching.

3. **Normalize URLs Across Languages and Parameters**
   - **Description**: Treat pages with different languages or non-functional parameters (e.g., UTM parameters) as the same page.
   - **Status**: Implemented via `normalizeUrl` in `src/shared/utils/normalizeUrl.ts`, which removes UTM parameters and normalizes URLs.

7. **Threaded Comments Under Annotations**
   - **Description**: Display comments as a thread under each annotation.
   - **Status**: Implemented. Comments are stored as sub-nodes in Gun.js (`annotations/<url>/<annotationId>/comments`) and displayed as a thread under each annotation. Added a collapse/expand mechanism to save space, with comments collapsed by default and a toggle button ("+ Show X comments" to expand, "− Hide comments" to collapse).

14. **Collaborative Deletion and Moderation System**
   - **Description**: Implement a system where users can delete their own content, hide or report others’ content, and choose between diverse or ideologically aligned content environments. Admins can delete content via consensus, and a truthfulness-based ranking system uses implicit signals (hides, reports) to sort content. Adult content is filtered for underage or unverified users, with age verification persisting across devices.
   - **Status**: Partially Implemented. 
     - **Deletion for Own Comments**: Implemented. Users can delete their own comments, verified by DID matching in `CommentList.tsx`. Fixed an issue where clicking the delete button accidentally deleted the entire annotation by ensuring `onDeleteComment` is passed correctly from `AnnotationUI.tsx` to `CommentList.tsx`. Fixed a prop-passing issue where `onDeleteComment` was `undefined` by adding a guard clause in `AnnotationList.tsx` to render `CommentList` only when the prop is available.
     - **Hiding, Reporting, and Ranking**: In progress. Planned for the next sprint to add "Hide" and "Report" buttons, implement truthfulness ranking with diversity weighting, and create a `ModeratorPanel.tsx` for admin voting.
     - **User Preferences and Age Verification**: Planned for the next sprint to add opinion preference toggle and age verification in the settings panel.
   - **Implementation Details**:
     - **Ownership-Based Deletion**: Users delete their own annotations/comments (verified by DID), setting `isDeleted: true` in Gun.js. Implemented for comments in `CommentList.tsx`, with buttons visible only to authors (`isOwnComment: true`). Extend to annotations in `AnnotationList.tsx`. Update `AnnotationManager.ts` and `gun-server.js` to enforce DID checks.
     - **Admin Deletion**: Define admins in Gun.js `admins/<did>` node. Admins delete content via a voting process (3 signed votes in `deletionVotes/<contentId>`), setting `isDeleted: true`. Implement in `CommentManager.ts` and plan `ModeratorPanel.tsx` for voting UI.
     - **Hiding Content**: Users hide annotations/comments persistently in `user_<did>/hiddenContent/<contentId>`, affecting only their view. Add “Hide”/”Unhide” buttons in `CommentList.tsx` and `AnnotationList.tsx`. Filter hidden content in `AnnotationManager.getAnnotations`. Submit hide signals to `rankingSignals/<contentId>/hideCount`.
     - **Reporting Content**: Users report content as misleading/harmful, storing in `reportedContent/<contentId>` with reasons (e.g., “Misinformation”). Add “Report” button with dropdown in `CommentList.tsx`. Signals increment `rankingSignals/<contentId>/reportCount` and flag for admin review.
     - **Truthfulness Ranking**: Rank content by `weightedScore` in `rankingSignals/<contentId>`, computed from hide (`weight=1`) and report (`weight=2`) signals. Weight signals by user diversity (Hamming distance of `user_<did>/perspective` hashes, updated via `simpleHash` of hide/report history). Sort in `AnnotationManager.getAnnotations`. Inspired by X Community Notes, emphasizing diverse consensus.
     - **User Opinion Preference**: Users choose “Diverse Opinions” (prioritize high `weightedScore`) or “My Perspective” (boost content matching `perspective.hash`) in a settings panel (⚙️ icon). Store in `user_<did>/preferences`. Blend 20% diverse content in bias mode to avoid echo chambers.
     - **Adult Content and Age Verification**: Users report adult content, tagged by admins in `contentTags/<contentId>`. Unverified/underage users see filtered content (strict default, e.g., hide untagged items). Store self-declared age verification in `user_<did>/ageVerification`. Apply strictest jurisdictional rules (e.g., COPPA, GDPR-K) by default, with optional location detection. Implement prompt in settings panel.
     - **Security**: Use Gun.js SEA for signed deletion, hide, and report requests. Validate signatures in `AnnotationManager.ts` and `gun-server.js`. Log actions in `deletionLog`. Limit one hide/report per user per item in `rankingSignals/<contentId>/userDIDs`. Apply rate limits in `user_<did>/actionLimits`.
     - **UI and Notifications**: Add buttons in `CommentList.tsx` (Delete: orange `#f97316`, Hide: gray `#666`, Report: red `#dc2626`). Use toast notifications (“Deleted,” “Hidden,” “Reported”). Plan settings panel for preferences and unhiding. Notify users of deletions/reports via future notification system (Requirements 5/6).
     - **Testing**: Simulate deletion (own/admin), hiding, reporting, and ranking scenarios. Test preference persistence across devices/cache clears. Validate age filtering and jurisdictional compliance.
   - **Future Enhancements**:
     - Refine diversity with AI clustering (Requirement 6).
     - Add comment sentiment analysis (keyword-based).
     - Implement third-party age verification.
     - Track content views for exposure normalization.

### Sharing and Accessibility
10. **Share Annotations on Social Media and Messaging**
   - **Description**: Allow users to share annotations on social media (e.g., Twitter, Facebook), messaging platforms (e.g., WhatsApp), or other channels to attract new users. Include engaging text or images (e.g., annotation snippets) and a link that checks for the CitizenX extension. If installed, navigate to the annotated page; if not, direct to an installation page.
   - **Status**: Implemented. Users can share annotations via a custom share modal (macOS) or `navigator.share` (other platforms). The link (`https://citizenx.app/check-extension?annotationId=<id>&url=<encoded-url>`) redirects appropriately based on browser and extension presence. URL shortening was considered but deferred due to ad-supported preview pages in Bitly’s free plan.

11. **View Annotations on Non-Chrome Browsers**
   - **Description**: Redirect users clicking an annotation sharing URL on non-Chrome browsers (e.g., mobile, Safari, Firefox) to a page on `https://citizenx.app` that displays the annotated page’s URL as a clickable link (opening in a new tab). Reuse the extension’s UI, DID, and code to allow viewing and interacting with annotations, mimicking the extension’s functionality.
   - **Status**: Implemented. The `/view-annotations` page displays annotations with a clickable link to the annotated page (opens in a new tab). Styled with white `#fff`, teal `#2c7a7b`, Inter font, and includes a loading spinner.
   - **Mobile Detection**: Added a mobile check (`/android|iphone|ipad|ipod|mobile/i.test(userAgent)`) in `check-extension.js` to redirect mobile browsers (e.g., Chrome on Android) to `/view-annotations`, as they cannot install extensions.
   - **Author Display Fix**: Fixed an issue where authors were displayed as "Unknown" by updating the `/api/annotations` endpoint on the Render server to fetch user profiles from Gun.js with retries (up to 5 attempts) and in-memory caching (5-minute TTL), ensuring the correct `authorHandle` (e.g., "Waltika") is included in the response. Extended the fix to the extension by improving profile fetching in `useAnnotations.ts` to handle real-time updates.
   - **SSR Limitation**: The `/view-annotations` endpoint fails to render due to `AnnotationList` using React hooks (`useState`), which are not supported in server-side rendering. A temporary workaround (`AnnotationListServer.tsx`) was reverted to focus on scalability and security.

12. **Screenshots for Shared Annotations**
   - **Description**: Provide a screenshot of the top of the annotated page for both the annotation feature on non-Chrome browsers and the sharing functionality. Store the screenshot with the annotations, but only once.
   - **Status**: Pending.

### Decentralized Infrastructure
8. **Decentralized Persistence Using IPFS**
   - **Description**: Ensure persistence is decentralized using IPFS.
   - **Status**: Partially implemented. Shifted to Gun.js for decentralized storage, which can integrate with IPFS in the future. Currently using a single Gun.js node on Render, with persistence pending a paid plan upgrade or pinning service.

9. **Decentralized Collaborative Features**
   - **Description**: Ensure notifications and other collaborative features do not rely on a centralized server.
   - **Status**: Partially implemented. Gun.js provides decentralized storage, but notifications are pending. The Render server is a single point of failure until a pinning service or multi-node setup is implemented.
   - **Sharding and Replication**: Designed domain-based sharding (`annotations_<domain>`) with peer-to-peer replication (minimum factor of three), ensuring servers only replicate relevant shards while maintaining availability.

### Code and Deployment
13. **Factor Out Common Functions**
   - **Description**: Factor out common functions between the CitizenX Chrome extension and the `gun-server` project to avoid code duplication and ensure consistency.
   - **Status**: Pending.
   - **Details**: Extract common utility functions (e.g., `normalizeUrl`, `simpleHash`) and shared logic (e.g., sharding calculations, data validation) into a shared library (`@citizenx/shared`) for use by both projects. Use a monorepo structure (e.g., `pnpm` workspaces) or publish as a private npm package. Update `gun-server.js` to use ES modules or TypeScript, and adjust the extension’s build process (Vite) to include the library. Test for consistent behavior across projects.

7. **Deployment Synchronization**
   - **Description**: Find a solution for deployment synchronization between the server and the extension, given the differing deployment times (server vs. Google Extension Store).
   - **Status**: Pending.

8. **Reuse Node.js Code for SSR on the Website**
   - **Description**: Reuse the Node.js code from the Chrome extension’s side panel (e.g., `useAnnotations.ts`, `useStorage.ts`, `AnnotationList.tsx`) as the Node.js backend for server-side rendering (SSR) on the website server (`gun-server.js`). Render the `AnnotationList` component on the server, minimizing client-side JavaScript while maintaining the same UI and functionality as the extension.
   - **Status**: Planned.
   - **Details**: Extract common logic and components into `@citizenx/shared` (Requirement 13). Create a server-side version of `useAnnotations.ts` (`getAnnotationsServer.ts`) without React hooks. Update `gun-server.js` to use `ReactDOMServer.renderToString` for SSR on `/view-annotations`. Include minimal client-side JavaScript for interactivity, leveraging `@citizenx/shared`.

### Notifications and Page History
4. **Track Page History**
   - **Description**: Maintain a list of pages visited by the user in the background script for notifications.
   - **Status**: Pending.

5. **Notify on New Annotations**
   - **Description**: Notify users through the extension when annotations are made by others on pages they visited.
   - **Status**: Pending.

6. **Notify on New Comments**
   - **Description**: Notify users through the extension when comments are made on their annotations.
   - **Status**: Pending.

### UI Enhancements
5. **WYSIWYG Editor for Annotations**
   - **Description**: Use a WYSIWYG editor for annotations (but not comments).
   - **Status**: Implemented. Used Quill.js for WYSIWYG editing in annotations, with toolbar options for bold, italic, underline, lists, and links. Comments remain plain text.

### Comment Collapsing Mechanism
- **Description**: Add a collapse/expand mechanism to the comments section under each annotation to save space. Display comments collapsed by default with a toggle button (e.g., "+ Show X comments" to expand, "− Hide comments" to collapse).
- **Implementation Details**:
  - Added state management in `AnnotationList.tsx` to track the collapsed/expanded state for each annotation’s comments.
  - Implemented a toggle button above the comments section, visible only if there are comments.
  - Styled the toggle button in `AnnotationList.css` to match the UI’s design (teal color `#2c7a7b` with hover effect `#4a999a`).
- **Status**: Completed.

## Requirements - Future Versions
1. **Crypto/Ledger-Based Ownership**
   - **Description**: Implement a crypto/ledger-based ownership structure for the project.
   - **Status**: Pending.

2. **Crypto-Based Payment System**
   - **Description**: Implement a crypto-based system for paying contributors, users (if there is profit), and other connected systems.
   - **Status**: Pending.

3. **Share Annotations for Growth Hacking**
   - **Description**: Allow users to share annotations on social platforms, messages, and emails to attract new users.
   - **Status**: Implemented in v1.0 (Req 10).

4. **Structured Data in Annotations**
   - **Description**: Enrich annotations with structured data to enable complex reasoning.
   - **Status**: Pending.

6. **AI-Powered Structured Information Extraction**
   - **Description**: Implement an AI-powered feature to extract structured information from annotations and comments in a JSON format shared between users. Allow users to create, suggest, and vote on extraction schemas.
   - **Status**: Pending.

9. **Enhance Real-Time Updates with Gun.js Subscriptions**
   - **Description**: Improve real-time updates by relying entirely on Gun.js subscriptions (`map().on()`) in `useAnnotations.ts`, removing the initial fetch dependency. Implement debouncing to batch updates and pre-fetch profiles for known authors.
   - **Status**: Planned.
   - **Details**: Update `useAnnotations.ts` to populate `annotations` state incrementally via `map().on()`. Use `lodash/debounce` for batching updates (100ms delay). Pre-fetch profiles to minimize delays in displaying author handles. Test with simultaneous updates to ensure smooth UI updates without flickering.

## Non Functional Requirements - v1.0
1. **Zero Installation Beyond Extension**
   - **Description**: Ensure no additional installations are required on the user’s device beyond the Chrome extension.
   - **Status**: Met. No additional installations are required.

2. **100% Serverless with IPFS Storage**
   - **Description**: Ensure the system is 100% serverless, storing data on IPFS.
   - **Status**: Partially met. Using Gun.js for decentralized storage, with a single node on Render. IPFS integration is planned for future versions.

3. **Decentralized Authentication**
   - **Description**: Ensure authentication is decentralized.
   - **Status**: Met. Authentication uses DIDs stored in Gun.js (`user_<did>`).

4. **Minimize Data Loss**
   - **Description**: Ensure minimal data loss in case of network issues or other failures.
   - **Status**: Partially met. Data is stored in Gun.js with a replication factor of three across servers (user-deployed, pinning service). Persistence requires a pinning service or Render paid plan upgrade.

5. **Minimal Chrome Extension Content**
   - **Description**: Ensure the Chrome extension is minimal, with all code bundled locally to comply with Chrome Web Store policies.
   - **Status**: Met. All code is bundled locally using Vite.

6. **Secure Access Technologies**
   - **Description**: Secure JWT tokens and other access technologies against hacking.
   - **Status**: Not applicable for JWT tokens (not used). Implemented security for annotations:
     - Signed annotations and write requests to prevent unauthorized changes.
     - Immutable versioning with tombstones for deletions.
     - Protection against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks through signature verification, rate-limiting, timestamp checks, and logging (enhanced by Requirement 14 for deletion security).

7. **Add Privacy Policy to Manifest**
   - **Description**: Add a privacy policy to `manifest.json` once the website is available: `"privacy_policy": "https://yourwebsite.com/privacy-policy"`.
   - **Status**: Pending. Awaiting website and `manifest.json` updates.

## Focus for Next Sprint
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
  - Ensure only owners of annotations/comments and admins can delete them (Requirement 14):
    - Extend the existing signature verification in `AnnotationManager.ts` to check the requester’s DID against the `author` field for delete operations.
    - Define an admin role in Gun.js (`admins/<did>`) with a list of trusted DIDs, allowing admins to delete content after community consensus.
    - Update `writeRequests` to include delete operations, ensuring servers verify ownership or admin status before applying deletions.
  - Test security measures by simulating attacks (e.g., unauthorized deletion attempts, XSS injection, DoS attacks) and verifying that protections hold.

- **Code Factorization**:
  - Begin implementing the shared library (`@citizenx/shared`) as per Requirement 13, starting with `normalizeUrl` and `simpleHash`.
  - Update `gun-server.js` and relevant extension files (`AnnotationManager.ts`, `CleanupManager.ts`) to import from the shared library.
  - Test the integration to ensure no regressions in sharding or URL normalization.

- **Collaborative Deletion and Moderation**:
  - Complete hiding and reporting for comments and annotations, updating `CommentList.tsx` and `AnnotationList.tsx`.
  - Implement opinion preference toggle and age verification in settings panel.
  - Develop truthfulness ranking in `AnnotationManager.ts` with diversity weighting.
  - Create `ModeratorPanel.tsx` for admin voting on reported content.
  - Test deletion, hiding, reporting, ranking, and age filtering workflows.

- **Real-Time Updates**:
  - Enhance real-time updates using Gun.js subscriptions (Requirement 9 - Future Versions), ensuring `useAnnotations.ts` relies on `map().on()` for seamless UI updates without initial fetch dependency.