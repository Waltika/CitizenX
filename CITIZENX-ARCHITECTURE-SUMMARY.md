# CitizenX Architecture Summary

## Overview
CitizenX is a browser extension that enables users to annotate web pages and share those annotations in a decentralized manner using Gun.js. The project leverages React for the UI, TypeScript for type safety, and Vite as the build tool. A companion pinning service enhances data persistence and scalability. The current focus is on ensuring annotations and user profiles are persisted and displayed correctly across devices and browsers, with plans to implement page history tracking, notifications, and multi-browser support in the future.

As of May 9, 2025, the core functionality of creating, storing, and sharing annotations is working, along with displaying annotations on non-Chrome browsers. Domain-based sharding and sub-sharding for high-traffic domains are partially implemented to improve scalability. Support for advanced users to specify their primary server is in place, and security measures protect against unauthorized changes. Issues with author names displaying as "Unknown" and comment deletion have been resolved. A pinning service supports persistent storage, but validation is needed to ensure deleted items do not reappear after server restarts. Full sharding adoption is pending migration and testing.

## Current Status

### Annotations and Comments
- **Functionality**: Users can create annotations and comments on web pages (e.g., `https://x.com/DrNeilStone/status/1918363323982332114`). These are stored in a Gun.js database with sharded nodes (`annotations_<domain>`) and replicated across peers when available.
- **Implementation**:
  - Annotations are stored in Gun.js under sharded nodes (e.g., `annotations_example_com`), with sub-sharding for high-traffic domains (e.g., `annotations_google_com_shard_0`). Comments are stored as sub-nodes (`annotations/<url>/<annotationId>/comments`).
  - The `useAnnotations` hook manages annotation creation, retrieval, and real-time updates via `map().on()` in `AnnotationManager.ts`.
  - Legacy annotations in the `annotations` node are migrated to sharded nodes via `CleanupManager.ts`.
- **Comment Deletion**: Fixed an issue where clicking the delete button for a comment (`CommentList.tsx`) accidentally deleted the entire annotation by ensuring `onDeleteComment` is passed correctly from `AnnotationUI.tsx` to `AnnotationList.tsx` to `CommentList.tsx`. Added a guard clause in `AnnotationList.tsx` to render `CommentList` only when `onDeleteComment` is available, resolving the `undefined` prop error. Deletion marks comments as `isDeleted: true`, with cleanup handled by `CleanupManager.ts`.
- **Comment Collapsing**: Implemented a collapse/expand mechanism for comments under each annotation to save space. Comments are collapsed by default with a toggle button ("+ Show X comments" to expand, "− Hide comments" to collapse), styled in `AnnotationList.css` (teal `#2c7a7b`, hover `#4a999a`).

### User Profiles and Authentication
- **Functionality**: Users authenticate via a DID (Decentralized Identifier) and create profiles with a handle and profile picture, stored in Gun.js under a user-specific namespace (`user_<did>/profile`) and mirrored in the global `profiles` node for lookup.
- **Implementation**:
  - Shifted from OrbitDB to Gun.js, with user-specific namespaces to isolate DID and profile data, resolving conflicts across users.
  - The `currentDID` is cached in `localStorage` to persist on the same device, with import/export functionality for cross-device use.
  - Fixed DID import/export to include profiles, with improved error handling for user-friendly feedback (e.g., "Incorrect passphrase or corrupted data").
- **Primary Server for Advanced Users**: Advanced users can deploy their own Gun.js server and set it as their "primary server" by specifying its URL (e.g., `https://user123-server.example.com/gun`) in the settings menu. The URL is stored in `user_<did>/primaryServer`, and the extension prioritizes this server for the user’s data interactions, falling back to other peers if offline.
- **Author Display Issue**: Fixed an issue where authors were displayed as "Unknown" in the extension and on the `/view-annotations` page by updating profile fetching in `useAnnotations.ts` to handle real-time updates and enhancing the `/api/annotations` endpoint on the Render server to fetch profiles from Gun.js (`profiles/<did>` or `user_<did>/profile`) with retries (up to 5 attempts) and in-memory caching (5-minute TTL). This ensures the correct `authorHandle` (e.g., "Waltika") is displayed.

### Scalability
- **Current State**: Domain-based sharding is implemented, storing annotations in nodes like `annotations_example_com`, with sub-sharding for high-traffic domains (e.g., `google.com`, `facebook.com`, `twitter.com`) using URL hashing (10 sub-shards). Legacy annotations are migrated to sharded nodes via `CleanupManager.ts`.
- **Implementation**:
  - `AnnotationManager.ts`, `CommentManager.ts`, and `gun-server.js` use `getShardKey` to determine the appropriate shard or sub-shard based on the URL’s domain and hash.
  - Servers replicate only shards relevant to their users’ activity (e.g., pages visited or annotated).
  - Migration from the legacy `annotations` node to sharded nodes is ongoing, with `migrateAnnotations` ensuring data consistency.
- **Concern**: Full adoption of sharding requires completing the migration and testing with high-traffic scenarios to ensure scalability.
- **Next Steps**: Test sharding with simulated high-traffic scenarios (e.g., 10,000 annotations on `google.com`). Explore multi-node setups or pinning services to enhance replication.

### Non-Chrome Browsers (Req 11)
- **Functionality**: Implemented the `/view-annotations` page on `https://citizenx.app` to display annotations for non-Chrome browsers. The page shows all annotations for a given URL, with a clickable link to the annotated page (opens in a new tab). Added a loading spinner with proper show/hide logic, styled to match the CitizenX design (white `#fff`, teal `#2c7a7b`, Inter font).
- **Implementation**:
  - The `/api/annotations` endpoint fetches annotations from sharded and legacy nodes, ensuring compatibility during migration.
  - Mobile browsers (e.g., Chrome on Android) are detected using `/android|iphone|ipad|ipod|mobile/i.test(userAgent)` and redirected to `/view-annotations`, as they cannot install extensions.
  - Fixed an issue where Chrome on Android was incorrectly identified as non-Chrome by correcting the user-agent check in `check-extension.js`.
- **SSR Limitation**: The `/view-annotations` endpoint fails to render due to `AnnotationList` using React hooks (`useState`), which are not supported in server-side rendering. A temporary workaround (`AnnotationListServer.tsx`) was reverted to focus on scalability and security.

### Sharing (Req 10)
- **Functionality**: Users can share annotations via a custom share modal (macOS) or `navigator.share` (other platforms). The sharing link format is `https://citizenx.app/check-extension?annotationId=<id>&url=<encoded-url>`. Considered URL shortening with Short.io but deferred due to ad-supported preview pages in the free plan.

### Persistence
- **Current State**: Gun.js is configured to use persistent storage on a paid Render.com plan (`/var/data/gun-data`) with `radisk: true`. Data is stored in sharded nodes and replicated across peers with a minimum factor of three. A pinning service (`citizen-pinning-service`) enhances persistence with scripts for cleanup and migration.
- **Implementation**:
  - `gun-server.js` creates the `/var/data/gun-data` directory on startup and uses RAD for persistent storage.
  - `CleanupManager.ts` runs an hourly job to tombstone (`put(null)`) annotations and comments marked as `isDeleted: true`, ensuring they are removed from the database.
  - `migrateAnnotations` moves legacy data to sharded nodes, preserving `isDeleted` status.
  - The pinning service includes `cleanup-sharded-node.js` and `migrate-legacy-data.js` to maintain sharded node consistency and sync-comment-states.js to ensure comment state consistency across nodes.
- **Issue**: Deleted elements (marked as `isDeleted: true`) reappear after server restarts, indicating a persistence or cleanup issue. Possible causes include incomplete cleanup before restarts, replication of non-tombstoned data from peers, or migration reintroducing deleted items.
- **Proposed Solution**:
  - Validate tombstone persistence by simulating server restarts and checking `/var/data/gun-data`.
  - Enhance `CleanupManager.ts` to prioritize tombstoning before replication.
  - Ensure `migrateAnnotations` respects `isDeleted: true` during migration.
  - Leverage the pinning service’s cleanup scripts to ensure consistent data across nodes.

### Security
- **Functionality**: Designed a security model to ensure annotations can only be modified or deleted by their creator and to protect against hacking:
  - **Signed Annotations**: Each annotation is signed with the creator’s private key, with the signature stored in Gun.js (e.g., `annotations/<url>/<annotationId>/signature`). Clients verify signatures on read, discarding tampered data.
  - **Signed Write Requests**: Write operations (create, update, delete) are signed and stored in `writeRequests`. Servers verify the signature and ensure the requester’s DID matches the annotation’s `author` before applying the write.
  - **Immutable Versioning**: Annotations are stored as immutable versions (`annotations/<url>/<annotationId>/versions/<timestamp>`), with updates creating new versions. Deletions use tombstones (`deleted: true`).
  - **Attack Mitigation**: Protect against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks through signature verification, rate-limiting (`rateLimits/<did>`), timestamp checks, and logging unauthorized attempts (`securityLogs`).
- **Comment Deletion Security**: Ensured that only the comment’s author can delete it by verifying the DID in `CommentList.tsx` (`isOwnComment: true`). Fixed an issue where the entire annotation was deleted by ensuring `onDeleteComment` is correctly passed and called, preventing accidental annotation deletion.

## Architecture

### Tech Stack
- **Frontend (CitizenX)**:
  - **Framework**: React with TypeScript, built using Vite.
  - **Browser APIs**: Chrome Extension APIs (`chrome.storage.local` for DID and private key storage, `chrome.runtime` for communication).
  - **Libraries**:
    - `gun`: For decentralized database operations.
    - `react-dom`: For rendering the UI in the side panel.
    - `quill`: For WYSIWYG editing of annotations.
- **Server (Citizen-Pinning-Service)**:
  - **Framework**: Node.js with Express for API endpoints.
  - **Storage**: Gun.js with RAD (Random Access Disk) for persistent storage (`/var/data/gun-data`, `radata/`).
  - **Libraries**:
    - `gun`: For decentralized database operations.
    - `ipfs-core`: For IPFS integration (partial, under testing).
    - `express`, `cors`: For API routing and cross-origin resource sharing.
    - `dompurify`: For input sanitization to prevent XSS attacks.
- **Infrastructure**:
  - Single Gun.js bootstrap node on Render (`https://citizen-x-bootsrap.onrender.com`).
  - Webflow for hosting static pages (`https://citizenx.app`).
  - Persistent storage on Render.com (`/var/data/gun-data`, `radata/`).

### Key Components
1. **CitizenX Extension**:
   - **Hooks**:
     - `useUserProfile.ts`: Manages user authentication, DID generation, and profile creation/update. Stores the DID and private key in `chrome.storage.local`, caches `currentDID` in `localStorage`, and persists profiles in Gun.js (`user_<did>/profile` and `profiles` nodes). Supports setting a `primaryServer` URL for advanced users.
     - `useAnnotations.ts`: Manages annotation creation, storage, and retrieval. Stores annotations in sharded Gun.js nodes and supports real-time updates via `map().on()`. Includes client-side ownership checks for writes. Improved profile fetching to handle real-time updates, fixing the "Unknown" author issue.
     - `useStorage.ts`: Initializes the Gun.js instance and handles database operations.
   - **Components**:
     - `AnnotationUI.tsx`: The main UI component for the side panel, rendering the annotation list, profile modal, and import/export UI. Uses `useUserProfile` and `useAnnotations` hooks. Includes a settings menu (⚙️ icon) with options for authentication, sign-out, export/import identity, and setting a primary server for advanced users.
     - `AnnotationList.tsx`: Displays a list of annotations and comments for the current page, looking up user profiles by DID. Handles sharing functionality and comment collapsing. Fixed comment deletion by ensuring `onDeleteComment` is passed correctly and only renders `CommentList` when the prop is available.
     - `Comment.tsx`: Renders individual comments within annotations, displaying user info.
   - **Storage**:
     - **Gun.js Nodes**:
       - `annotations_<domain>`: Stores annotations and comments for specific domains (e.g., `annotations_example_com`), with sub-shards for high-traffic domains.
       - `annotations`: Legacy node for annotations, being migrated to sharded nodes.
       - `profiles`: Global lookup for user profiles (DID, handle, profile picture).
       - `user_<did>`: User-specific namespace for DID, profile data, and `primaryServer` URL.
       - `writeRequests`: Temporary node for signed write requests (e.g., create, update, delete operations).
       - `securityLogs`: Logs unauthorized write attempts for auditing.
       - `rateLimits`: Tracks rate-limiting data per DID to prevent DoS attacks.
     - **Local Storage**:
       - `currentDID`: Caches the user’s DID for persistence on the same device.
     - **Chrome Storage**:
       - Stores the user’s DID and private key for authentication persistence.

2. **Citizen-Pinning-Service**:
   - **Purpose**: Enhances data persistence and scalability by managing Gun.js nodes, migrating legacy data, and ensuring sharded node consistency.
   - **Key Scripts**:
     - `gun-server.js`: Main server script, hosting the Gun.js node and API endpoints (`/api/annotations`, `/api/comments`, `/api/shorten`).
     - `cleanup-sharded-node.js`: Cleans sharded nodes by removing tombstones and inconsistent data.
     - `migrate-legacy-data.js`: Migrates legacy annotations from the `annotations` node to sharded nodes (`annotations_<domain>`).
     - `sync-comment-states.js`: Synchronizes comment states across nodes to ensure consistency.
     - Testing scripts (`test-ipfs-core-address.js`, `test-replication.js`, `testSharding.js`, `ulvis-api-test.js`) validate IPFS integration, replication, sharding, and API functionality.
   - **Storage**:
     - `gun-data/`, `radata/`: Persistent storage directories for Gun.js data, supporting sharded nodes and user data.
   - **Integration with CitizenX**:
     - The pinning service acts as the primary Gun.js node (`https://citizen-x-bootsrap.onrender.com`), accessible via `GunRepository.ts`.
     - Advanced users can configure their own nodes as `primaryServer`, with the pinning service as a fallback.
     - The service’s migration and cleanup scripts ensure data consistency, addressing issues like deleted items reappearing.

3. **Static Pages**:
   - `/view-annotations`: Displays annotations for non-Chrome browsers, with a clickable link to the annotated page (opens in a new tab). Styled with white `#fff`, teal `#2c7a7b`, Inter font, and includes a loading spinner.
   - `/check-extension`: Redirects users based on browser and extension presence (Chrome with extension to the annotated page, Chrome without extension to `/install`, non-Chrome or mobile to `/view-annotations`).

### Data Flow
1. **User Authentication**:
   - On extension load, `useUserProfile` checks `localStorage` for a cached `currentDID`, verifying it in Gun.js (`user_<did>/did`).
   - If none exists, the user can authenticate, generating a new DID and private key, stored in `chrome.storage.local` and Gun.js.
   - The user creates a profile (handle, profile picture), saved to Gun.js (`user_<did>/profile` and `profiles` nodes).
   - Users can import/export their DID and profile for cross-device use.
   - Advanced users can set a `primaryServer` URL via the settings menu, stored in `user_<did>/primaryServer`.

2. **Profile Loading**:
   - `useUserProfile` loads profiles from Gun.js (`profiles` node), creating a map of DIDs to profile data for display in annotations and comments.
   - Fetches the `primaryServer` URL from `user_<did>/primaryServer` and adds it to the Gun.js peer list for prioritization.

3. **Annotation Creation and Deletion**:
   - Users create annotations via `AnnotationUI`, which calls `useAnnotations` to save them in sharded Gun.js nodes (`annotations_<domain>/<url>/<annotationId>`).
   - Annotations are signed with the user’s private key, with the signature stored in `annotations/<url>/<annotationId>/signature`.
   - Writes (create, update, delete) are sent as signed requests to `writeRequests`, verified by servers before applying.
   - Annotations are stored as immutable versions (`annotations/<url>/<annotationId>/versions/<timestamp>`), with deletions using tombstones (`deleted: true`).
   - Users can delete their own comments via `CommentList.tsx`, with the `onDeleteComment` prop correctly passed to trigger a DELETE request to `/api/comments`, ensuring only the comment is removed and the annotation remains intact.
   - `AnnotationList` and `Comment` components fetch annotations, verify signatures, and look up user profiles by DID to display the handle and profile picture.
   - `CleanupManager.ts` tombstones deleted items hourly, with `cleanup-sharded-node.js` ensuring sharded node consistency.

4. **Non-Chrome Browsers**:
   - The `/check-extension` page redirects non-Chrome users to `/view-annotations`, which fetches annotations from the Render server and displays them, mimicking the extension’s UI.
   - Mobile browsers (e.g., Chrome on Android) are detected and redirected to `/view-annotations`.
   - The `/api/annotations` endpoint on the Render server fetches annotations and user profiles, including the correct `authorHandle` with retries and caching to handle replication delays.

### Network Setup
- **Current**: Single-node setup using a Gun.js bootstrap node on Render (`https://citizen-x-bootsrap.onrender.com`) with persistent storage (`/var/data/gun-data`, `radata/`), supported by the citizen-pinning-service.
  - **Issue**: Deleted elements reappearing after restarts suggest incomplete cleanup or replication issues.
  - **Fix**: Validate tombstone persistence, enhance cleanup to prioritize tombstoning, and ensure migration respects `isDeleted: true`.
- **Proposed Deployment**:
  - **Bootstrap Nodes**: Three bootstrap nodes across different regions (e.g., US-East, US-West, EU-Central), acting as entry points to the network. They replicate metadata (`knownPeers`) but not all annotation data, routing requests to servers hosting specific shards.
  - **User-Deployed Servers**: Advanced users can deploy their own Gun.js servers, set as their `primaryServer`. These servers replicate shards for domains the user interacts with.
  - **Sharding**: Domain-based sharding (`annotations_<domain>`), with sub-sharding for popular domains.
  - **Replication**: Peer-to-peer replication with a minimum factor of three, prioritizing user-deployed servers or pinning services.
- **Future**: Deploy a multi-node test network to enable robust replication and persistence, leveraging the pinning service’s infrastructure.

## Scalability Plan
- **Current State**: Domain-based sharding (`annotations_<domain>`) and sub-sharding for high-traffic domains (10 sub-shards) are implemented in `AnnotationManager.ts`, `CommentManager.ts`, and `gun-server.js`. Migration from the legacy `annotations` node to sharded nodes is ongoing, supported by `migrate-legacy-data.js`.
- **Proposed Solution**: Complete migration and test sharding with high-traffic scenarios to ensure scalability to millions of users and trillions of annotations.
- **Next Steps**: Simulate high-traffic scenarios, finalize migration, and enhance the pinning service for robust replication.

## Security Plan
- **Goal**: Ensure annotations can only be modified or deleted by their creator and protect the system from hacking.
- **Mechanisms**:
  - **Signed Annotations**: Each annotation is signed with the creator’s private key, with the signature stored in Gun.js. Clients verify signatures on read, discarding tampered data.
  - **Signed Write Requests**: Write operations are signed and stored in `writeRequests`. Servers verify the signature and DID before applying the write.
  - **Immutable Versioning**: Annotations are stored as immutable versions, with deletions using tombstones.
  - **Attack Mitigation**: Signature verification, rate-limiting, timestamp checks, and logging protect against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks.
  - **Comment Deletion**: Only the comment’s author can delete it, verified by DID matching (`isOwnComment: true`).

## Pending Features
- **Page History (Requirement 4)**: Track visited URLs in the background script for notifications.
- **Notifications (Requirement 5)**: Notify users of new annotations on previously visited pages.
- **Notifications (Requirement 6)**: Notify users of new comments on their annotations.
- **Pinning Service**: Fully integrate the citizen-pinning-service to ensure data persistence and replication, validating cleanup and migration processes.
- **Primary Server UI**: Add a "Set Primary Server" option in the settings menu (⚙️ icon) in `AnnotationUI.tsx`, allowing advanced users to specify their server URL, saved to `user_<did>/primaryServer`.
- **Collaborative Deletion and Moderation (Requirement 14)**:
  - Add hiding and reporting functionality for comments and annotations.
  - Implement user opinion preferences and age verification in the settings panel.
  - Develop truthfulness ranking with diversity weighting.
  - Create a `ModeratorPanel.tsx` for admin voting on reported content.
- **Real-Time Updates (Requirement 9)**:
  - Current: Real-time updates are supported via `map().on()` in `AnnotationManager.ts`.
  - Pending: Remove initial fetch dependency, implement debouncing with `lodash/debounce` (100ms delay), and pre-fetch profiles for known authors.
- **Multi-Browser Extension Support (Requirement 10)**:
  - Extend the extension to support Firefox, Edge, Safari, and other browsers that allow extensions.
  - Reuse existing React components, hooks, and storage logic, with an abstraction layer for browser-specific APIs.
  - Update `vite.config.extension.js` for multi-browser builds.

## File Structure
- **CitizenX Extension**:
  - **Source (`src/`)**:
    - `assets/`: Static assets (`citizenx-logo.png`).
    - `components/`: React components and CSS (`AnnotationList.tsx`, `AnnotationUI.tsx`, `CommentList.tsx`, `SettingsPanel.tsx`, `ShareModal.tsx`, etc.).
    - `config/`: Configuration (`boostrap.ts`).
    - `content/`: Content scripts and wallet connector (`index.tsx`, `walletConnector.js`).
    - `contentScripts/`: Page interaction scripts (`highlightAnnotation.ts`, `injectPresence.ts`).
    - `hooks/`: React hooks (`useAnnotations.ts`, `useUserProfile.ts`, `useStorage.ts`).
    - `shared/utils/`: Shared utilities (`normalizeUrl.ts`).
    - `sidepanel/`: Side panel UI (`index.tsx`, `index.html`, `index.css`).
    - `storage/`: Storage management (`AnnotationManager.ts`, `GunRepository.ts`, `PeerManager.ts`, `ProfileManager.ts`, `CleanupManager.ts`, `CommentManager.ts`, `StorageRepository.ts`).
    - `types/`: TypeScript types (`index.ts`, `orbitdb-core.d.ts`, `window.d.ts`).
    - `utils/`: Utilities (`crypto.ts`, `did.ts`, `shortenUrl.ts`, `stripHtml.ts`).
    - `web/`: Non-Chrome browser support (`check-extension.js`, `view-annotations.js`).
  - **Build Output (`dist/`)**:
    - `assets/`: Compiled assets (`citizenx-logo.png`, `normalizeUrl.js`, `sidepanel.css`).
    - `background.js`: Background script.
    - `contentScripts/`: Compiled content scripts (`highlightAnnotation.js`, `injectPresence.js`).
    - `icons/`: Extension icons (`icon128.png`, `icon16.png`, `icon32.png`).
    - `manifest.json`: Extension manifest.
    - `sidepanel.js`: Compiled side panel script.
  - **Testing**:
    - `__mocks__/`: Mock implementations (`@orbitdb/core.js`, `helia.js`).
    - `jest.config.ts`, `jest.setup.js`: Jest configuration.
  - **Scripts**:
    - `scripts/libp2p-diagnostic.js`: Diagnostic script for libp2p.
  - **Configuration**:
    - `manifest.json`: Extension manifest.
    - `tsconfig.json`: TypeScript configuration.
    - `vite.config.extension.js`: Vite build configuration.

- **Citizen-Pinning-Service**:
  - **Scripts**:
    - `gun-server.js`: Main Gun.js server and API endpoints.
    - `cleanup-sharded-node.js`: Cleans sharded nodes.
    - `migrate-legacy-data.js`: Migrates legacy data to sharded nodes.
    - `sync-comment-states.js`: Synchronizes comment states.
    - `test-ipfs-core-address.js`, `test-replication.js`, `testSharding.js`, `ulvis-api-test.js`: Testing scripts.
  - **Storage**:
    - `gun-data/`, `radata/`: Persistent storage for Gun.js data.
  - **Configuration**:
    - `package.json`: Node.js dependencies and scripts.
    - `package-lock.json`: Dependency lockfile.

## Last Updated
May 9, 2025