# CitizenX

A decentralized Chrome extension for annotating websites in order to bring a knowledge layer on top of the internet.

## Requirements - v1.0

### Core Functionality
1. **Unique User Identity Across Devices**
   - **Description**: Ensure the user remains unique and consistent even if they change devices, clear browser data, or lose their device.
   - **Status**: Implemented. Users authenticate via a DID (Decentralized Identifier), stored in `chrome.storage.local` and Gun.js (`user_<did>`). The `currentDID` is cached in `localStorage` for persistence on the same device, with import/export functionality for cross-device use. Private keys are used for SEA signing, with nonces added to prevent replay attacks.
   - **Advanced User Support**: Advanced users can deploy their own Gun.js server and set it as their "primary server" via the settings menu (⚙️ icon), storing the URL in `user_<did>/primaryServer`. The extension prioritizes this server for their data interactions.

2. **User Profiles with Handle and Picture**
   - **Description**: Allow users to have a profile picture and a handle.
   - **Status**: Implemented. Users can create profiles with a handle and profile picture, stored in Gun.js (`user_<did>/profile` and `profiles` nodes). Profiles are included in the import/export process. Fixed an issue where author handles displayed as "Unknown" by improving profile fetching in `useAnnotations.ts` with real-time updates and updating the `/api/annotations` endpoint to fetch profiles with retries (up to 5 attempts) and in-memory caching (5-minute TTL).

3. **Normalize URLs Across Languages and Parameters**
   - **Description**: Treat pages with different languages or non-functional parameters (e.g., UTM parameters) as the same page.
   - **Status**: Implemented via `normalizeUrl` in `src/shared/utils/normalizeUrl.ts`, which removes UTM parameters and normalizes URLs.

7. **Threaded Comments Under Annotations**
   - **Description**: Display comments as a thread under each annotation.
   - **Status**: Implemented. Comments are stored as sub-nodes in Gun.js (`annotations/<url>/<annotationId>/comments`) with SEA signatures and nonces, displayed as a thread under each annotation. Added a collapse/expand mechanism to save space, with comments collapsed by default and a toggle button ("+ Show X comments" to expand, "− Hide comments" to collapse). Fixed comment deletion to ensure only the author’s comments are deleted, verified by DID matching.

8. **Decentralized Persistence Using IPFS**
   - **Description**: Ensure persistence is decentralized using IPFS.
   - **Status**: Partially implemented. Gun.js is used for decentralized storage with persistent storage on a paid Render.com plan (`/var/data/gun-data`). Data is replicated across nodes with a minimum factor of three. IPFS integration is planned for future versions to enhance decentralization.
   - **Implementation Details**:
     - Gun.js stores data in sharded nodes (`annotations_<domain>`) with sub-sharding for high-traffic domains.
     - Persistence is achieved using RAD (Random Access Disk) on the server, but cleanup of deleted items (`isDeleted: true`) requires validation to ensure tombstones persist across restarts.
     - **Testing**: Validate persistence by simulating server restarts and checking that deleted items remain tombstoned. Ensure `CleanupManager.ts` tombstones deleted items before replication.

9. **Decentralized Collaborative Features**
   - **Description**: Ensure notifications and other collaborative features do not rely on a centralized server.
   - **Status**: Partially implemented. Gun.js provides decentralized storage with domain-based sharding (`annotations_<domain>`) and sub-sharding for high-traffic domains. SEA signing with nonces ensures secure writes. Notifications are pending. Multi-node setups or pinning services are needed to eliminate single points of failure.
   - **Sharding and Replication**:
     - Domain-based sharding distributes annotations by URL domain, with sub-sharding for popular domains (e.g., `google.com`).
     - Peer-to-peer replication ensures a minimum replication factor of three, prioritizing user-deployed servers or pinning services.
     - **Testing**: Test sharding with high-traffic scenarios (e.g., 10,000 annotations on `google.com`) to ensure scalability and data consistency.

14. **Collaborative Deletion and Moderation System**
   - **Description**: Implement a system where users can delete their own content, hide or report others’ content, and choose between diverse or ideologically aligned content environments. Admins can delete content via consensus, and a truthfulness-based ranking system uses implicit signals (hides, reports) to sort content. Adult content is filtered for underage or unverified users, with age verification persisting across devices.
   - **Status**: Partially Implemented.
     - **Deletion for Own Comments**: Implemented. Users can delete their own comments, verified by DID matching in `CommentList.tsx`. Fixed an issue where clicking the delete button accidentally deleted the entire annotation by ensuring `onDeleteComment` is passed correctly from `AnnotationUI.tsx` to `CommentList.tsx`. Added SEA signing with nonces for deletion requests, verified in `AnnotationManager.ts` and `gun-server.js`. Fixed a prop-passing issue where `onDeleteComment` was `undefined` by adding a guard clause in `AnnotationList.tsx`.
     - **Deletion for Own Annotations**: Implemented. Users can delete their own annotations via `AnnotationList.tsx`, with SEA-signed deletion requests including nonces, verified by DID matching in `AnnotationManager.ts`.
     - **Hiding, Reporting, and Ranking**: In progress. Planned for the next sprint to add "Hide" and "Report" buttons, implement truthfulness ranking with diversity weighting, and create a `ModeratorPanel.tsx` for admin voting.
     - **User Preferences and Age Verification**: Planned for the next sprint to add opinion preference toggle and age verification in the settings panel.
   - **Implementation Details**:
     - **Ownership-Based Deletion**: Users delete their own annotations/comments (verified by DID), setting `isDeleted: true` in Gun.js. Implemented for comments in `CommentList.tsx` and annotations in `AnnotationList.tsx`, with buttons visible only to authors (`isOwnComment: true`, `isOwnAnnotation: true`). Deletion requests are signed with SEA, including nonces, and verified in `AnnotationManager.ts` and `gun-server.js`.
     - **Admin Deletion**: Define admins in Gun.js `admins/<did>` node. Admins delete content via a voting process (3 signed votes in `deletionVotes/<contentId>`), setting `isDeleted: true`. Implement in `CommentManager.ts` and plan `ModeratorPanel.tsx` for voting UI.
     - **Hiding Content**: Users hide annotations/comments persistently in `user_<did>/hiddenContent/<contentId>`, affecting only their view. Add “Hide”/”Unhide” buttons in `CommentList.tsx` and `AnnotationList.tsx`. Filter hidden content in `AnnotationManager.getAnnotations`. Submit hide signals to `rankingSignals/<contentId>/hideCount`.
     - **Reporting Content**: Users report content as misleading/harmful, storing in `reportedContent/<contentId>` with reasons (e.g., “Misinformation”). Add “Report” button with dropdown in `CommentList.tsx`. Signals increment `rankingSignals/<contentId>/reportCount` and flag for admin review.
     - **Truthfulness Ranking**: Rank content by `weightedScore` in `rankingSignals/<contentId>`, computed from hide (`weight=1`) and report (`weight=2`) signals. Weight signals by user diversity (Hamming distance of `user_<did>/perspective` hashes, updated via `simpleHash` of hide/report history). Sort in `AnnotationManager.getAnnotations`. Inspired by X Community Notes, emphasizing diverse consensus.
     - **User Opinion Preference**: Users choose “Diverse Opinions” (prioritize high `weightedScore`) or “My Perspective” (boost content matching `perspective.hash`) in a settings panel (⚙️ icon). Store in `user_<did>/preferences`. Blend 20% diverse content in bias mode to avoid echo chambers.
     - **Adult Content and Age Verification**: Users report adult content, tagged by admins in `contentTags/<contentId>`. Unverified/underage users see filtered content (strict default, e.g., hide untagged items). Store self-declared age verification in `user_<did>/ageVerification`. Apply strictest jurisdictional rules (e.g., COPPA, GDPR-K) by default, with optional location detection. Implement prompt in settings panel.
     - **Security**: Use Gun.js SEA for signed deletion, hide, and report requests, including nonces to prevent replay attacks. Validate signatures in `AnnotationManager.ts` and `gun-server.js`. Log actions in `deletionLog`. Limit one hide/report per user per item in `rankingSignals/<contentId>/userDIDs`. Apply rate limits in `user_<did>/actionLimits`.
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
   - **Status**: Partially Implemented. The `/view-annotations` page displays annotations with a clickable link to the annotated page (opens in a new tab). Styled with white `#fff`, teal `#2c7a7b`, Inter font, and includes a loading spinner.
   - **Mobile Detection**: Added a mobile check (`/android|iphone|ipad|ipod|mobile/i.test(userAgent)`) in `check-extension.js` to redirect mobile browsers (e.g., Chrome on Android) to `/view-annotations`, as they cannot install extensions.
   - **Author Display Fix**: Fixed an issue where authors were displayed as "Unknown" by updating the `/api/annotations` endpoint to fetch user profiles from Gun.js with retries (up to 5 attempts) and in-memory caching (5-minute TTL), ensuring the correct `authorHandle` (e.g., "Waltika") is included in the response. Extended the fix to the extension by improving profile fetching in `useAnnotations.ts` to handle real-time updates.
   - **SSR Limitation**: The `/view-annotations` endpoint fails to render due to `AnnotationList` using React hooks (`useState`), which are not supported in server-side rendering. A temporary workaround (`AnnotationListServer.tsx`) was reverted to focus on scalability and security—even though it’s still in the file structure, it’s not currently used.
   - **Deployment Issue (May 10, 2025)**: The `/api/annotations` endpoint (`https://citizen-x-bootsrap.onrender.com/api/annotations?url=https://www.aaa.com/International`) returns `{"error":"No annotations found for this URL"}`, despite the extension loading annotations correctly. Server logs show the endpoint queries the correct shard (`annotations_www_aaa_com`) but skips valid annotations as duplicates or deleted, likely due to overzealous deduplication (`loadedAnnotations`, `annotationCache`). Fixed by clearing `annotationCache` per request, increasing the fetch timeout to 5000ms, and adding debug logging in `gun-server.js`. Validation is needed to confirm the fix and investigate data consistency issues.

12. **Screenshots for Shared Annotations**
   - **Description**: Provide a screenshot of the top of the annotated page for both the annotation feature on non-Chrome browsers and the sharing functionality. Store the screenshot with the annotations, but only once.
   - **Status**: Pending.

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
   - **Description**: Enrich annotationsemporal with structured data to enable complex reasoning.
   - **Status**: Pending.

6. **AI-Powered Structured Information Extraction**
   - **Description**: Implement an AI-powered feature to extract structured information from annotations and comments in a JSON format shared between users. Allow users to create, suggest, and vote on extraction schemas.
   - **Status**: Pending.

9. **Enhance Real-Time Updates with Gun.js Subscriptions**
   - **Description**: Improve real-time updates by relying entirely on Gun.js subscriptions (`map().on()`) in `useAnnotations.ts`, removing the initial fetch dependency. Implement debouncing to batch updates and pre-fetch profiles for known authors.
   - **Status**: Partially implemented in v1.0. Real-time updates are supported via `map().on()` in `AnnotationManager.ts` with a 2000ms `debounceInterval` to minimize redundant updates (`"Skipping duplicate update"` logs). Initial fetch dependency remains, and debouncing with `lodash/debounce` (100ms delay) and profile pre-fetching are pending.
   - **Details**: Update `useAnnotations.ts` to populate `annotations` state incrementally via `map().on()`. Use `lodash/debounce` for batching updates (100ms delay). Pre-fetch profiles to minimize delays in displaying author handles. Test with simultaneous updates to ensure smooth UI updates without flickering.

10. **Multi-Browser Extension Support**
   - **Description**: Extend the CitizenX extension to support all browsers that allow extensions (e.g., Firefox, Edge, Safari), maximizing reuse of the existing codebase to minimize duplication.
   - **Status**: Pending.
   - **Details**:
     - Utilize WebExtension APIs for compatibility across Chrome, Firefox, and Edge.
     - Adapt for Safari using Safari Web Extensions, addressing specific manifest keys and native messaging requirements.
     - Reuse React components (`AnnotationList.tsx`, `AnnotationUI.tsx`), hooks (`useAnnotations.ts`, `useUserProfile.ts`), and storage logic (`AnnotationManager.ts`, `GunRepository.ts`) across browsers.
     - Implement an abstraction layer or polyfills to handle browser-specific APIs (e.g., `chrome.*` vs. `browser.*`).
     - Update `vite.config.extension.js` to support multi-browser builds.
     - Test extension functionality and UI consistency across all supported browsers.

11. **Encrypt Private Key in Local Storage**
   - **Description**: Encrypt the private key stored in `chrome.storage.local` using a user-provided passphrase to enhance security. Prompt for the passphrase during authentication or import, and decrypt the key when needed for signing operations (e.g., annotations, comments).
   - **Status**: Pending.
   - **Details**:
     - Modify `useUserProfile.ts` to encrypt the private key with a passphrase before storing in `chrome.storage.local` during `authenticate` or `importIdentity`.
     - Update `useAnnotations.ts` to decrypt the private key when signing annotations or comments, prompting for the passphrase if needed or caching it in memory for the session.
     - Update `PassphraseModal.tsx` or `SettingsPanel.tsx` to handle passphrase input for signing operations.
     - Test encryption/decryption with valid and invalid passphrases, ensuring seamless signing and recovery across devices.
     - Ensure backward compatibility with unencrypted private keys during transition.

## Non Functional Requirements - v1.0
1. **Zero Installation Beyond Extension**
   - **Description**: Ensure no additional installations are required on the user’s device beyond the Chrome extension.
   - **Status**: Met. No additional installations are required.

2. **100% Serverless with IPFS Storage**
   - **Description**: Ensure the system is 100% serverless, storing data on IPFS.
   - **Status**: Partially met. Gun.js provides decentralized storage with persistent storage on a paid Render.com plan (`/var/data/gun-data`). SEA signing with nonces enhances security. IPFS integration is planned for future versions. Cleanup of deleted items requires validation to prevent reappearance after restarts.

3. **Decentralized Authentication**
   - **Description**: Ensure authentication is decentralized and protects against impersonation, unauthorized privilege escalation, and unauthorized access to sensitive user information.
   - **Status**: Implemented. Authentication uses DIDs stored in Gun.js (`user_<did>`). Enhanced security measures with SEA signing and nonces align with industry standards for decentralized identity management and zero-knowledge proofs.
   - **Implementation Details**:
     - **Preventing Impersonation**:
       - **DID Generation and Storage**: Each user generates a unique DID using Gun.js SEA, creating a public-private key pair. The private key is stored securely in `chrome.storage.local` and Gun.js (`user_<did>/encryptedKey`). The DID is a hash of the public key, ensuring uniqueness and non-repudiation.
       - **Signature Verification**: All write operations (annotations, comments, deletions, profile updates) are signed with the user’s private key using Gun.js SEA, including a nonce to prevent replay attacks. The signature is stored alongside the data (e.g., `annotations/<url>/<annotationId>/signature`, `nonce`). Clients and servers (`AnnotationManager.ts`, `gun-server.js`) verify the signature against the DID’s public key (`user_<did>/publicKey`) before processing, preventing impersonation by fake peers, scripts, or agents.
       - **Anti-Spoofing Measures**: Nonce-based challenges in `writeRequests` prevent replay attacks. Each write includes a unique nonce and timestamp, verified by servers within a 5-minute window. Log failed signature verifications in `securityLogs/<did>/<timestamp>` to detect and block malicious peers.
       - **Testing**: Simulated impersonation attempts (e.g., fake DID with forged signatures, replayed requests) to ensure signatures and nonces are validated and unauthorized writes are rejected.
     - **Preventing Unauthorized Privilege Escalation**:
       - **Role-Based Access Control**: Roles (e.g., user, admin) are defined in Gun.js (`roles/<did>`). Admins are assigned in `admins/<did>`, signed by a trusted authority. Role assignments are verified by servers.
       - **Admin Actions**: Admin deletions require 3 signed votes in `deletionVotes/<contentId>`, verified against `admins/<did>/publicKey`. Prevents escalation by ensuring only verified admins perform moderation.
       - **Action Validation**: Privileged actions (e.g., commenting, deleting) verify the requester’s DID and role. Deletion requests check `isOwnComment` or admin status in `CommentList.tsx` and `AnnotationManager.ts`. Servers reject unsigned or unauthorized requests, logging attempts in `securityLogs`.
       - **Rate Limiting**: Per-DID rate limits (`rateLimits/<did>`) prevent abuse (100 actions/hour, exponential backoff). Implemented in `gun-server.js`.
       - **Testing**: Simulated escalation attempts (e.g., non-admin deleting content, forging admin signatures) to ensure role checks and signature verifications block unauthorized actions.
     - **Protecting Sensitive Information**:
       - **Zero-Knowledge Age Verification**: Planned for next sprint using `zkp.js` for ZKP-based age verification in `user_<did>/ageVerificationProof`, ensuring no personal data is revealed.
       - **Encrypted Sensitive Data**: Sensitive data (e.g., preferences) is stored in `user_<did>/private`, encrypted with the user’s private key. Access requires signed permission grants (`user_<did>/permissions/<accessorDID>`).
       - **Crowdsourced Verification**: Planned for next sprint with blinded signatures in `user_<did>/verifiedAttributes`, preventing identity linking.
       - **Data Access Controls**: Only the user’s client can decrypt `user_<did>/private` data. Public data (annotations, profiles) is anonymized (linked to DID). Log unauthorized access attempts in `securityLogs`.
       - **Privacy by Design**: Strict compliance with COPPA, GDPR-K by default, minimizing data collection. Optional location detection in `user_<did>/locationPreferences` (encrypted) with consent.
       - **Testing**: Simulated unauthorized access (e.g., reading `user_<did>/private` without permission) to ensure encryption and access controls prevent leakage.
     - **Security Auditing**:
       - Conducted initial audits of SEA implementation, focusing on nonce-based signing and verification in `AnnotationManager.ts` and `gun-server.js`.
       - Planned penetration testing and bug bounty program for future sprints.
     - **Future Enhancements**:
       - Integrate W3C DID and Verifiable Credentials for interoperability.
       - Explore blockchain-based DID anchoring.
       - Implement AI-driven anomaly detection in `securityLogs`.

4. **Minimize Data Loss**
   - **Description**: Ensure minimal data loss in case of network issues or other failures.
   - **Status**: Partially met. Data is stored in Gun.js with a replication factor of three across servers. Persistent storage on Render.com (`/var/data/gun-data`) uses RAD. SEA-signed writes with nonces ensure integrity. Validation is needed to prevent deleted items from reappearing after restarts.
   - **Implementation Details**:
     - `CleanupManager.ts` tombstones deleted items (`isDeleted: true`) hourly, but validation is pending to ensure tombstones persist across restarts.
     - `migrate-legacy-data.js` in the pinning service respects `isDeleted: true` during migration to sharded nodes.
     - **Testing**: Simulate server restarts to verify tombstone persistence. Test replication to ensure deleted items are not reintroduced.

5. **Minimal Chrome Extension Content**
   - **Description**: Ensure the Chrome extension is minimal, with all code bundled locally to comply with Chrome Web Store policies.
   - **Status**: Met. All code is bundled locally using Vite.

6. **Secure Access Technologies**
   - **Description**: Secure annotations and user data against hacking, impersonation, privilege escalation, and unauthorized data access.
   - **Status**: Implemented. Enhanced security with SEA signing, nonces, and verification aligns with decentralized identity standards.
   - **Implementation Details**:
     - **Signed Annotations and Requests**: All annotations, comments, and write requests are signed with the user’s private key using Gun.js SEA, including nonces. Signatures are stored (e.g., `annotations/<url>/<annotationId>/signature`, `nonce`). Clients (`AnnotationManager.ts`) and servers (`gun-server.js`) verify signatures, discarding tampered or unsigned data.
     - **Immutable Versioning**: Annotations and comments are stored as immutable versions (`annotations/<url>/<annotationId>/versions/<timestamp>`), with updates creating new versions and deletions using tombstones (`isDeleted: true`). Ensures auditability and prevents unauthorized modifications.
     - **Attack Mitigation**: Protects against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks:
       - **Signature Verification**: Enforced in `AnnotationManager.ts` and `gun-server.js` for all writes, including nonce checks.
       - **Nonce and Timestamp Checks**: Nonces and timestamps in `writeRequests` are verified within a 5-minute window to prevent replays.
       - **Rate Limiting**: Per-DID limits (`rateLimits/<did>`) prevent abuse (100 actions/hour, exponential backoff) in `gun-server.js`.
       - **Logging**: Unauthorized attempts are logged in `securityLogs/<did>/<timestamp>` for auditing.
       - **Input Sanitization**: DOMPurify sanitizes inputs in `useAnnotations.ts` and `gun-server.js` to prevent XSS.
       - **CORS Security**: Strict CORS policy in `gun-server.js` (`Access-Control-Allow-Origin: https://citizenx.app`).
     - **Role-Based Security**: Only authorized DIDs perform privileged actions. Deletion checks `isOwnComment` or admin status in `CommentList.tsx` and `AnnotationManager.ts`.
     - **Zero-Knowledge Proofs**: Planned for age verification and sensitive data in next sprint.
     - **Testing**: Simulated attacks (e.g., data injection, DID spoofing, XSS, DoS) to validate protections. Tested nonce-based signing and verification for annotations, comments, and deletions.
     - **Future Enhancements**:
       - Integrate W3C DID and Verifiable Credentials.
       - Implement blockchain-based DID anchoring.
       - Add AI-driven anomaly detection in `securityLogs`.

7. **Add Privacy Policy to Manifest**
   - **Description**: Add a privacy policy to `manifest.json` once the website is available: `"privacy_policy": "https://yourwebsite.com/privacy-policy"`.
   - **Status**: Pending. Awaiting website and `manifest.json` updates.

## Focus for Next Sprint
- **Sharding (Scalability)**:
  - Complete migration of legacy annotations to sharded nodes (`annotations_<domain>`), ensuring `isDeleted: true` items are tombstoned.
  - Test sharding with high-traffic scenarios (e.g., 10,000 annotations on `google.com`) to ensure scalability and data consistency.
  - Explore multi-node setups or pinning services to enhance replication.

- **Persistence**:
  - Validate tombstone persistence on Render.com by simulating server restarts and checking `/var/data/gun-data`.
  - Enhance `CleanupManager.ts` to prioritize tombstoning before replication, preventing deleted items from reappearing.
  - Test replication across peers to ensure deleted items are not reintroduced.

- **Security**:
  - Implement ZKP for age verification in `user_<did>/ageVerificationProof` using `zkp.js`.
  - Add blinded signature scheme for crowdsourced verification in `user_<did>/verifiedAttributes`.
  - Conduct penetration testing to validate SEA signing, nonce verification, rate limiting, and input sanitization.
  - Extend signature and nonce verification to hiding and reporting actions.

- **Code Factorization**:
  - Implement the shared library (`@citizenx/shared`) with `normalizeUrl` and `simpleHash`.
  - Update `gun-server.js`, `AnnotationManager.ts`, and `CleanupManager.ts` to import from the shared library.
  - Test integration to ensure no regressions in sharding or URL normalization.

- **Collaborative Deletion and Moderation**:
  - Add hiding and reporting for comments and annotations in `CommentList.tsx` and `AnnotationList.tsx`.
  - Implement opinion preference toggle and age verification in settings panel.
  - Develop truthfulness ranking in `AnnotationManager.ts`