# CitizenX Architecture Summary

## Overview
CitizenX is a browser extension that enables users to annotate web pages and share those annotations in a decentralized manner using Gun.js. The project leverages React for the UI, TypeScript for type safety, and Vite as the build tool. The current focus is on ensuring annotations and user profiles are persisted and displayed correctly across devices and browsers, with plans to implement page history tracking and notifications in the future.

As of May 1, 2025, the core functionality of creating, storing, and sharing annotations is working, along with displaying annotations on non-Chrome browsers. However, there are scalability and persistence concerns with the current Gun.js setup that need to be addressed in future iterations.

## Current Status
- **Annotations and Comments**: Users can create annotations and comments on web pages (e.g., `https://www.aaa.com/International/`). These are stored in a Gun.js database (`annotations`) with replication across peers when available.
  - **Previous Issue Resolved**: Annotations initially displayed users as "Unknown" due to a timing issue between `useAuth` and `useUserProfiles` hooks. This was fixed by polling `localStorage` for profile updates, but the architecture has since shifted to Gun.js.
  - **Current Implementation**: Annotations are stored in Gun.js under the `annotations` node, keyed by URL, with comments stored as sub-nodes (`annotations/<url>/<annotationId>/comments`). The `useAnnotations` hook manages annotation creation, retrieval, and real-time updates.
- **User Profiles and Authentication**: Users authenticate via a DID (Decentralized Identifier) and create profiles with a handle and profile picture, stored in Gun.js under a user-specific namespace (`user_<did>/profile`) and mirrored in the global `profiles` node for lookup.
  - **Change**: Shifted from OrbitDB to Gun.js, with user-specific namespaces to isolate DID and profile data, resolving conflicts across users. The `currentDID` is cached in `localStorage` to persist on the same device, with import/export functionality for cross-device use.
  - **Import/Export**: Fixed DID import/export to include profiles, with improved error handling for user-friendly feedback (e.g., "Incorrect passphrase or corrupted data").
- **Build Issue**: A previous build failure due to a default import mismatch in `AnnotationUI.tsx` was resolved by ensuring proper import syntax and TypeScript configuration.
- **Scalability Concern**: All annotations are currently stored in a single Gun.js node (`annotations`). This approach won’t scale if the number of annotations grows significantly (e.g., trillions of annotations across all web pages). A proposed solution is to create one Gun.js node per domain name to limit replication scope.
- **Non-Chrome Browsers (Req 11)**: Implemented the `/view-annotations` page on `https://citizenx.app` to display annotations for non-Chrome browsers. The page shows all annotations for a given URL, with a clickable link to the annotated page (opening in a new tab). Added a loading spinner with proper show/hide logic, styled to match the CitizenX design (white `#fff`, teal `#2c7a7b`, Inter font).
- **Sharing (Req 10)**: Users can share annotations via a custom share modal (macOS) or `navigator.share` (other platforms). The sharing link format is `https://citizenx.app/check-extension?annotationId=<id>&url=<encoded-url>`. Considered URL shortening with Bitly but deferred due to ad-supported preview pages in the free plan.
- **Persistence**: Attempted to store Gun.js data at `/var/data/gun-data` on the Render server, but storage is ephemeral due to the free plan. A paid plan upgrade is needed for persistence.

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
   - `useUserProfile.ts`: Manages user authentication, DID generation, and profile creation/update. Stores the DID and private key in `chrome.storage.local`, caches `currentDID` in `localStorage`, and persists profiles in Gun.js (`user_<did>/profile` and `profiles` nodes).
   - `useAnnotations.ts`: Manages annotation creation, storage, and retrieval. Stores annotations in a Gun.js node (`annotations`) and supports real-time updates.
   - `useStorage.ts`: Initializes the Gun.js instance and handles database operations.

2. **Components**:
   - `AnnotationUI.tsx`: The main UI component for the side panel, rendering the annotation list, profile modal, and import/export UI. Uses `useUserProfile` and `useAnnotations` hooks.
   - `AnnotationList.tsx`: Displays a list of annotations and comments for the current page, looking up user profiles by DID. Handles sharing functionality.
   - `Comment.tsx`: Renders individual comments within annotations, displaying user info.

3. **Storage**:
   - **Gun.js Nodes**:
     - `annotations`: Stores annotations and comments for all pages (to be split by domain in the future).
     - `profiles`: Global lookup for user profiles (DID, handle, profile picture).
     - `user_<did>`: User-specific namespace for DID and profile data.
   - **Local Storage**:
     - `currentDID`: Caches the user’s DID for persistence on the same device.
   - **Chrome Storage**:
     - Stores the user’s DID and private key for authentication persistence.

4. **Static Pages**:
   - `/view-annotations`: Displays annotations for non-Chrome browsers, with a clickable link to the annotated page (opens in a new tab). Styled with white `#fff`, teal `#2c7a7b`, Inter font, and includes a loading spinner.

### Data Flow
1. **User Authentication**:
   - On extension load, `useUserProfile` checks `localStorage` for a cached `currentDID`, verifying it in Gun.js (`user_<did>/did`).
   - If none exists, the user can authenticate, generating a new DID and private key, stored in `chrome.storage.local` and Gun.js.
   - The user creates a profile (handle, profile picture), saved to Gun.js (`user_<did>/profile` and `profiles` nodes).
   - Users can import/export their DID and profile for cross-device use.

2. **Profile Loading**:
   - `useUserProfile` loads profiles from Gun.js (`profiles` node), creating a map of DIDs to profile data for display in annotations and comments.

3. **Annotation Creation**:
   - Users create annotations via `AnnotationUI`, which calls `useAnnotations` to save them in Gun.js (`annotations/<url>/<annotationId>`).
   - `AnnotationList` and `Comment` components fetch annotations and look up user profiles by DID to display the handle and profile picture.

4. **Non-Chrome Browsers**:
   - The `/check-extension` page redirects non-Chrome users to `/view-annotations`, which fetches annotations from the Render server and displays them, mimicking the extension’s UI.

### Network Setup
- **Current**: Single-node setup using a Gun.js bootstrap node on Render (`https://citizen-x-bootsrap.onrender.com`).
  - **Issue**: Data storage is ephemeral due to Render’s free plan. Upgrading to a paid plan is required for persistence.
  - **Planned Fix**: Implement a pinning service for Gun.js to ensure data persistence and replication across nodes (e.g., Voyager, or a custom solution). Added as a non-functional requirement.
- **Future**: Consider a multi-node test network or production deployment with active peers to enable proper replication.

## Scalability Plan
- **Current Limitation**: All annotations are stored in a single Gun.js node (`annotations`), which won’t scale to trillions of annotations across millions of users.
- **Proposed Solution**: Create one Gun.js node per domain name (e.g., `annotations-aaa.com`, `annotations-example.com`). This reduces the data each user needs to replicate and improves performance.
- **Next Steps**: Design and implement the per-domain node structure, updating `useAnnotations` and `useStorage` to dynamically select the appropriate node based on the current page’s domain.

## Pending Features
- **Page History (Requirement 4)**: Track visited URLs in the background script and store them for notifications.
- **Notifications (Requirement 5)**: Notify users of new annotations on previously visited pages.
- **Notifications (Requirement 6)**: Notify users of new comments on their annotations.
- **Pinning Service**: Implement a pinning service for Gun.js to prevent data loss and enable replication.

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
  - Gun.js: `annotations`, `profiles`, `user_<did>`

## Last Updated
May 1, 2025