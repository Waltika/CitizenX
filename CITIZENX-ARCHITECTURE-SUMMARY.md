# CitizenX Architecture Summary

## Overview
CitizenX is a browser extension that enables users to annotate web pages and share those annotations in a decentralized manner using OrbitDB. The project leverages React for the UI, TypeScript for type safety, and Vite as the build tool. The current focus is on ensuring annotations and user profiles are persisted and displayed correctly, with plans to implement page history tracking and notifications in the future.

As of April 23, 2025, the core functionality of creating, storing, and displaying annotations is working, but there are scalability concerns with the current OrbitDB setup that need to be addressed in future iterations.

## Current Status
- **Annotations and Comments**: Users can create annotations and comments on web pages (e.g., `https://www.aaa.com/International/`). These are stored locally in the browser’s `localStorage` with a fallback mechanism due to the lack of peers in the OrbitDB network.
  - **Issue Resolved**: Annotations and comments were initially displaying users as "Unknown" due to a timing issue between `useAuth` and `useUserProfiles` hooks. This was fixed by adding a polling mechanism in `useUserProfiles` to periodically check `localStorage` for profile updates, ensuring user profiles (e.g., handle "Waltika") are correctly associated with annotations.
- **User Profiles**: Users can authenticate via a DID (Decentralized Identifier) and create profiles with a handle and profile picture, stored in an OrbitDB database named `citizenx-profiles` and mirrored in `localStorage`.
- **Build Issue**: A recent build failure due to a default import mismatch in `AnnotationUI.tsx` was resolved by ensuring proper import syntax and TypeScript configuration.
- **Scalability Concern**: All annotations are currently stored in a single OrbitDB database (`citizenx-annotations`). This approach won’t scale if the number of annotations grows significantly (e.g., trillions of annotations across all web pages). A proposed solution is to create one OrbitDB database per domain name to limit replication scope.

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, built using Vite.
- **Decentralized Storage**: OrbitDB, running on top of Helia (a lightweight IPFS implementation).
- **Browser APIs**: Chrome Extension APIs (`chrome.storage.local` for DID and private key storage, `chrome.runtime` for communication).
- **Libraries**:
  - `@orbitdb/core`: For decentralized database operations.
  - `helia`: IPFS node implementation in the browser.
  - `@libp2p/*`: For peer-to-peer networking (e.g., WebSockets, WebRTC, circuit relay).
  - `react-dom`: For rendering the UI in the side panel.

### Key Components
1. **Hooks**:
   - `useAuth.ts`: Manages user authentication, DID generation, and profile creation/update. Stores the DID and private key in `chrome.storage.local` and profiles in `localStorage` and OrbitDB.
   - `useUserProfiles.ts`: Fetches and maintains a map of user profiles (keyed by DID) for display in annotations and comments. Polls `localStorage` every 5 seconds to ensure profile data is up-to-date.
   - `useAnnotations.ts`: Manages annotation creation, storage, and retrieval. Stores annotations in an OrbitDB database (`citizenx-annotations`) with a fallback to `localStorage`.
   - `useOrbitDB.ts`: Initializes the OrbitDB instance and handles database lifecycle (open/close).

2. **Components**:
   - `AnnotationUI.tsx`: The main UI component for the side panel, rendering the annotation list and profile modal. Uses `useAuth`, `useUserProfiles`, and `useAnnotations` hooks.
   - `AnnotationList.tsx`: Displays a list of annotations and comments for the current page, looking up user profiles by DID.
   - `Comment.tsx`: Renders individual comments within annotations, also displaying user info.

3. **Storage**:
   - **OrbitDB Databases**:
     - `citizenx-profiles`: Stores user profiles (DID, handle, profile picture).
     - `citizenx-annotations`: Stores annotations and comments for all pages (to be split by domain in the future).
   - **Local Storage**:
     - `citizenx-profiles`: Fallback storage for profiles.
     - `citizenx-annotations`: Fallback storage for annotations.
   - **Chrome Storage**:
     - Stores the user’s DID and private key for authentication persistence.

### Data Flow
1. **User Authentication**:
   - On extension load, `useAuth` checks `chrome.storage.local` for an existing DID.
   - If none exists, the user can authenticate, generating a new DID and private key.
   - The user creates a profile (handle, profile picture), which is saved to the `citizenx-profiles` OrbitDB database and mirrored in `localStorage`.

2. **Profile Loading**:
   - `useUserProfiles` loads profiles from `localStorage` and OrbitDB, creating a map of DIDs to profile data.
   - Polls `localStorage` every 5 seconds to catch updates, ensuring annotations display the correct user info.

3. **Annotation Creation**:
   - The user creates an annotation via `AnnotationUI`, which calls `useAnnotations` to save it.
   - The annotation is stored in the `citizenx-annotations` OrbitDB database with a fallback to `localStorage` if no peers are available (common in the current single-node setup).
   - `AnnotationList` and `Comment` components fetch annotations and look up user profiles by DID to display the handle and profile picture.

### Network Setup
- **Current**: Single-node setup in the browser using Helia and OrbitDB.
  - **Issue**: No peers are subscribed to the OrbitDB topics, leading to `PublishError.NoPeersSubscribedToTopic` warnings. Data is saved locally but not replicated.
  - **Planned Fix**: Implement a pinning service (e.g., Voyager, orbit-db-pinner) to ensure data persistence and replication across nodes. Added as a non-functional requirement.
- **Future**: Consider a multi-node test network or production deployment with active peers to enable proper replication.

## Scalability Plan
- **Current Limitation**: All annotations are stored in a single OrbitDB database, which won’t scale to trillions of annotations across millions of users.
- **Proposed Solution**: Create one OrbitDB database per domain name (e.g., `citizenx-annotations-aaa.com`, `citizenx-annotations-example.com`). This reduces the data each user needs to replicate and improves performance.
- **Next Steps**: Design and implement the per-domain database structure, updating `useAnnotations` and `useOrbitDB` to dynamically select the appropriate database based on the current page’s domain.

## Pending Features
- **Page History (Requirement 4)**: Track visited URLs in the background script and store them for notifications.
- **Notifications (Requirement 5)**: Notify users of new annotations on previously visited pages.
- **Pinning Service**: Implement a pinning service to prevent data loss and enable replication.

## File Structure
- **Hooks**:
  - `src/hooks/useAuth.ts`
  - `src/hooks/useUserProfiles.ts`
  - `src/hooks/useAnnotations.ts`
  - `src/hooks/useOrbitDB.ts`
- **Components**:
  - `src/components/AnnotationUI.tsx`
  - `src/components/AnnotationList.tsx`
  - `src/components/Comment.tsx`
- **Entry Points**:
  - `src/sidepanel/index.tsx`: Main entry point for the side panel UI.
- **Build Config**:
  - `vite.config.ts`: Vite configuration for building the side panel.
  - `build.js`: Custom build script for the extension.
- **Storage**:
  - `localStorage`: `citizenx-profiles`, `citizenx-annotations`
  - `chrome.storage.local`: DID and private key

## Last Updated
April 23, 2025