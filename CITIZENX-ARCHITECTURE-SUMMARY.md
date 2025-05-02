# CitizenX Architecture Summary

## Overview
CitizenX is a browser extension that enables users to annotate web pages and share those annotations in a decentralized manner using Gun.js. The project leverages React for the UI, TypeScript for type safety, and Vite as the build tool. The current focus is on ensuring annotations and user profiles are persisted and displayed correctly across devices and browsers, with plans to implement page history tracking and notifications in the future.

As of May 2, 2025, the core functionality of creating, storing, and sharing annotations is working, along with displaying annotations on non-Chrome browsers. We’ve designed a sharding and replication strategy to improve scalability, added support for advanced users to specify their primary server, outlined security measures to protect annotations from unauthorized changes, and resolved an issue with author names displaying as "Unknown" on the web version by updating the `/api/annotations` endpoint. However, there are still scalability and persistence concerns with the current Gun.js setup that need to be addressed in future iterations.

## Current Status
- **Annotations and Comments**: Users can create annotations and comments on web pages (e.g., `https://www.aaa.com/International/`). These are stored in a Gun.js database (`annotations`) with replication across peers when available.
  - **Implementation**: Annotations are stored in Gun.js under the `annotations` node, keyed by URL, with comments stored as sub-nodes (`annotations/<url>/<annotationId>/comments`). The `useAnnotations` hook manages annotation creation, retrieval, and real-time updates.
- **User Profiles and Authentication**: Users authenticate via a DID (Decentralized Identifier) and create profiles with a handle and profile picture, stored in Gun.js under a user-specific namespace (`user_<did>/profile`) and mirrored in the global `profiles` node for lookup.
  - **Change**: Shifted from OrbitDB to Gun.js, with user-specific namespaces to isolate DID and profile data, resolving conflicts across users. The `currentDID` is cached in `localStorage` to persist on the same device, with import/export functionality for cross-device use.
  - **Import/Export**: Fixed DID import/export to include profiles, with improved error handling for user-friendly feedback (e.g., "Incorrect passphrase or corrupted data").
  - **Primary Server for Advanced Users**: Advanced users can deploy their own Gun.js server and set it as their "primary server" by specifying its URL (e.g., `https://user123-server.example.com/gun`) in the settings menu. The URL is stored in `user_<did>/primaryServer`, and the extension prioritizes this server for the user’s data interactions, falling back to other peers if offline.
- **Build Issue**: A previous build failure due to a default import mismatch in `AnnotationUI.tsx` was resolved by ensuring proper import syntax and TypeScript configuration.
- **Scalability Concern**: All annotations are currently stored in a single Gun.js node (`annotations`), which won’t scale to trillions of annotations across millions of users.
  - **Proposed Solution**: Use domain-based sharding, creating one Gun.js node per domain (e.g., `annotations_example_com`, `annotations_aaa_com`). Servers replicate only the shards (domains) relevant to their users’ activity (e.g., pages visited or annotated).
  - **Sub-Sharding for Popular Domains**: For high-traffic domains (e.g., `google.com`), sub-shard by hashing the full URL (e.g., `annotations_google_com_shard_0`).
- **Non-Chrome Browsers (Req 11)**: Implemented the `/view-annotations` page on `https://citizenx.app` to display annotations for non-Chrome browsers. The page shows all annotations for a given URL, with a clickable link to the annotated page (opens in a new tab). Added a loading spinner with proper show/hide logic, styled to match the CitizenX design (white `#fff`, teal `#2c7a7b`, Inter font).
  - **Chrome on Android Issue**: Chrome on Android (e.g., on Samsung devices) was incorrectly identified as non-Chrome due to the `!userAgent.includes('samsung')` check in `check-extension.js`. Fixed by using `!userAgent.includes('samsungbrowser')` and adding a mobile check (`/android|iphone|ipad|ipod|mobile/i.test(userAgent)`) to redirect mobile browsers to `/view-annotations`, as they cannot install extensions.
  - **Author Display Issue**: Authors were displaying as "Unknown" on the `/view-annotations` page due to the Render server’s `/api/annotations` endpoint not fetching user profiles. Fixed by updating the endpoint to fetch profiles from Gun.js (`profiles/<did>` or `user_<did>/profile`) with retries (up to 5 attempts) and in-memory caching (5-minute TTL), ensuring the correct `authorHandle` is included in the response.
- **Sharing (Req 10)**: Users can share annotations via a custom share modal (macOS) or `navigator.share` (other platforms). The sharing link format is `https://citizenx.app/check-extension?annotationId=<id>&url=<encoded-url>`. Considered URL shortening with Bitly but deferred due to ad-supported preview pages in the free plan.
- **Persistence**: Attempted to store Gun.js data at `/var/data/gun-data` on the Render server, but storage is ephemeral due to the free plan. A paid plan upgrade is needed for persistence.
- **Security for Annotations**: Designed a security model to ensure annotations can only be modified or deleted by their creator and to protect against hacking:
  - **Signed Annotations**: Each annotation is signed with the creator’s private key, with the signature stored in Gun.js (e.g., `annotations/<url>/<annotationId>/signature`). Clients verify signatures on read, discarding tampered data.
  - **Signed Write Requests**: Write operations (create, update, delete) are signed and stored in `writeRequests`. Servers verify the signature and ensure the requester’s DID matches the annotation’s `author` before applying the write.
  - **Immutable Versioning**: Annotations are stored as immutable versions (`annotations/<url>/<annotationId>/versions/<timestamp>`), with updates creating new versions. Deletions use tombstones (`deleted: true`).
  - **Attack Mitigation**: Protect against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks through signature verification, rate-limiting (`rateLimits/<did>`), timestamp checks, and logging unauthorized attempts (`securityLogs`).

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, built using Vite.
- **Decentralized Storage**: Gun.js, running on top of WebRTC, WebSockets, and HTTP.
- **Browser APIs**: Chrome Extension APIs (`chrome.storage.local` for DID and private key storage, `chrome.runtime` for communication).
- **Libraries**:
  - `gun`: For decentralized database operations.
  - `react-dom`: For rendering the UI in the side panel.
- **Infrastructure**:
  - Single Gun.js bootstrap node on Render (`https://citizen-x-bootsrap.onrender.com`).
  - Webflow for hosting static pages (`https://citizenx.app`).

### Key Components
1. **Hooks**:
   - `useUserProfile.ts`: Manages user authentication, DID generation, and profile creation/update. Stores the DID and private key in `chrome.storage.local`, caches `currentDID` in `localStorage`, and persists profiles in Gun.js (`user_<did>/profile` and `profiles` nodes). Supports setting a `primaryServer` URL for advanced users.
   - `useAnnotations.ts`: Manages annotation creation, storage, and retrieval. Stores annotations in a Gun.js node (`annotations`) and supports real-time updates. Includes client-side ownership checks for writes.
   - `useStorage.ts`: Initializes the Gun.js instance and handles database operations.

2. **Components**:
   - `AnnotationUI.tsx`: The main UI component for the side panel, rendering the annotation list, profile modal, and import/export UI. Uses `useUserProfile` and `useAnnotations` hooks. Includes a settings menu (⚙️ icon) with options for authentication, sign-out, export/import identity, and setting a primary server for advanced users.
   - `AnnotationList.tsx`: Displays a list of annotations and comments for the current page, looking up user profiles by DID. Handles sharing functionality.
   - `Comment.tsx`: Renders individual comments within annotations, displaying user info.

3. **Storage**:
   - **Gun.js Nodes**:
     - `annotations`: Stores annotations and comments for all pages (to be split by domain in the future).
     - `profiles`: Global lookup for user profiles (DID, handle, profile picture).
     - `user_<did>`: User-specific namespace for DID, profile data, and `primaryServer` URL.
     - `writeRequests`: Temporary node for signed write requests (e.g., create, update, delete operations).
     - `securityLogs`: Logs unauthorized write attempts for auditing.
     - `rateLimits`: Tracks rate-limiting data per DID to prevent DoS attacks.
   - **Local Storage**:
     - `currentDID`: Caches the user’s DID for persistence on the same device.
   - **Chrome Storage**:
     - Stores the user’s DID and private key for authentication persistence.

4. **Static Pages**:
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

3. **Annotation Creation**:
   - Users create annotations via `AnnotationUI`, which calls `useAnnotations` to save them in Gun.js (`annotations/<url>/<annotationId>`).
   - Annotations are signed with the user’s private key, with the signature stored in `annotations/<url>/<annotationId>/signature`.
   - Writes (create, update, delete) are sent as signed requests to `writeRequests`, verified by servers before applying.
   - Annotations are stored as immutable versions (`annotations/<url>/<annotationId>/versions/<timestamp>`), with deletions using tombstones (`deleted: true`).
   - `AnnotationList` and `Comment` components fetch annotations, verify signatures, and look up user profiles by DID to display the handle and profile picture.

4. **Non-Chrome Browsers**:
   - The `/check-extension` page redirects non-Chrome users to `/view-annotations`, which fetches annotations from the Render server and displays them, mimicking the extension’s UI.
   - Mobile browsers (e.g., Chrome on Android) are detected using `/android|iphone|ipad|ipod|mobile/i.test(userAgent)` and redirected to `/view-annotations`, as they cannot install extensions.
   - The `/api/annotations` endpoint on the Render server fetches annotations and user profiles, including the correct `authorHandle` with retries and caching to handle replication delays.

### Network Setup
- **Current**: Single-node setup using a Gun.js bootstrap node on Render (`https://citizen-x-bootsrap.onrender.com`).
  - **Issue**: Data storage is ephemeral due to Render’s free plan. Upgrading to a paid plan is required for persistence.
  - **Planned Fix**: Implement a pinning service for Gun.js to ensure data persistence and replication across nodes (e.g., Voyager, or a custom solution). Added as a non-functional requirement.
- **Proposed Deployment**:
  - **Bootstrap Nodes**: Three bootstrap nodes across different regions (e.g., US-East, US-West, EU-Central), acting as entry points to the network. They replicate metadata (`knownPeers`) but not all annotation data, routing requests to servers hosting specific shards.
  - **User-Deployed Servers**: Advanced users can deploy their own Gun.js servers, set as their `primaryServer` in the settings menu. These servers replicate shards for domains the user interacts with (e.g., visited or annotated pages).
  - **Sharding**: Domain-based sharding (`annotations_<domain>`), with sub-sharding for popular domains (e.g., `annotations_google_com_shard_0`).
  - **Replication**: Peer-to-peer replication with a minimum replication factor of three, ensuring each shard is replicated to at least three servers (user-deployed servers, pinning service). The user’s primary server is prioritized for their data interactions, with fallback to other peers if offline.
- **Future**: Consider a multi-node test network or production deployment with active peers to enable proper replication.

## Scalability Plan
- **Current Limitation**: All annotations are stored in a single Gun.js node (`annotations`), which won’t scale to trillions of annotations across millions of users.
- **Proposed Solution**: Use domain-based sharding, creating one Gun.js node per domain (e.g., `annotations_example_com`, `annotations_aaa_com`). Servers replicate only the shards (domains) relevant to their users’ activity (e.g., pages visited or annotated).
- **Sub-Sharding for Popular Domains**: For high-traffic domains (e.g., `google.com`), sub-shard by hashing the full URL (e.g., `annotations_google_com_shard_0`).
- **Next Steps**: Design and implement the per-domain node structure, updating `useAnnotations` and `useStorage` to dynamically select the appropriate node based on the current page’s domain.

## Security Plan
- **Goal**: Ensure annotations can only be modified or deleted by their creator and protect the system from hacking.
- **Mechanisms**:
  - **Signed Annotations**: Each annotation is signed with the creator’s private key, with the signature stored in Gun.js. Clients verify signatures on read, discarding tampered data.
  - **Signed Write Requests**: Write operations (create, update, delete) are signed and stored in `writeRequests`. Servers verify the signature and ensure the requester’s DID matches the annotation’s `author` before applying the write.
  - **Immutable Versioning**: Annotations are stored as immutable versions (`annotations/<url>/<annotationId>/versions/<timestamp>`), with updates creating new versions. Deletions use tombstones (`deleted: true`).
  - **Attack Mitigation**: Protect against malicious peers, data injection, DID spoofing, replay attacks, and DoS attacks through signature verification, rate-limiting (`rateLimits/<did>`), timestamp checks, and logging unauthorized attempts (`securityLogs`).

## Pending Features
- **Page History (Requirement 4)**: Track visited URLs in the background script and store them for notifications.
- **Notifications (Requirement 5)**: Notify users of new annotations on previously visited pages.
- **Notifications (Requirement 6)**: Notify users of new comments on their annotations.
- **Pinning Service**: Implement a pinning service for Gun.js to prevent data loss and enable replication.
- **Primary Server UI**: Add a "Set Primary Server" option in the settings menu (⚙️ icon) in `AnnotationUI.tsx`, allowing advanced users to specify their server URL, which is saved to `user_<did>/primaryServer`.

## File Structure
- **Hooks**:
  - `src/hooks/useUserProfile.ts`
  - `src/hooks/useAnnotations.ts`
  - `src/hooks/useStorage.ts`
- **Components**:
  - `src/components/AnnotationUI.tsx`
  - `src/components/AnnotationList.tsx`
  - `src/components/Comment.tsx`
- **Entry Points**:
  - `src/sidepanel/index.tsx`: Main entry point for the side panel UI.
- **Build Config**:
  - `vite.config.ts`: Vite configuration for building the side panel.
- **Storage**:
  - `localStorage`: `currentDID`
  - `chrome.storage.local`: DID and private key
  - Gun.js: `annotations`, `profiles`, `user_<did>`, `writeRequests`, `securityLogs`, `rateLimits`

## Last Updated
May 2, 2025