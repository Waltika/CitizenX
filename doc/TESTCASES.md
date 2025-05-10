# CitizenX Test Cases

This document tracks test cases for the CitizenX Chrome extension, ensuring robust validation of features and requirements. Each test case includes objectives, prerequisites, actions, verification steps, expected outcomes, and cleanup instructions. Test cases are organized by feature or requirement.

## Feature: Preventing Impersonation (Non Functional Requirements - v1.0, Decentralized Authentication)

### Test Suite: Client-Side Signature Generation for Annotations (Step 1)

**Objective**: Verify that annotations are signed with the user’s private key using Gun.js SEA and stored with a `signature` field in Gun.js, ensuring prevention of impersonation by authenticating write operations.

**Prerequisites**:
- CitizenX extension installed in Chrome with updated files: `useAnnotations.ts`, `StorageRepository.ts`, `GunRepository.ts`, `AnnotationManager.ts` (artifact IDs `f864bf67-4587-45ed-8bf8-75dc68dbded4`, `c97507ff-1ce8-44f4-b765-7b88abc843d1`, `81929a55-c6d8-48b0-a386-edc660f729ae`, `adedf2d9-f756-4614-b7f4-6d00d30d5432`).
- User authenticated via `SettingsPanel` (in `ProfileSection.tsx`), with DID and private key in `chrome.storage.local`. Verify with:
  - Console logs: `useUserProfile: Loaded DID from storage: did:key:...`, `useUserProfile: Loaded private key from storage`.
  - Command: `chrome.storage.local.get(['current_did', 'privateKey'], console.log)`.
- Gun.js server running at `https://citizen-x-bootsrap.onrender.com/gun`.
- Extension rebuilt and reloaded (`npm run build` and reload in Chrome).
- Environment set to `NODE_ENV=development` for detailed logs.

#### Test Case 1: Create an Annotation
- **Objective**: Ensure an annotation is created, signed with the user’s private key, and stored in Gun.js with a `signature` field.
- **Action**:
  - Open the extension on a webpage (e.g., `https://x.com/DrNeilStone/status/1918363323982332114`).
  - Create an annotation using the Quill.js WYSIWYG editor (e.g., content: “New annotation”) and save.
- **Verification**:
  - Check console logs for:
    - `useAnnotations: handleSaveAnnotation called - content: <p>New annotation</p>`
    - `StorageRepository: saveAnnotation called with tabId: ...`
    - `GunRepository: saveAnnotation called with tabId: ..., did: did:key:...`
    - `AnnotationManager: Saving annotation with tabId: ..., did: did:key:...`
    - `AnnotationManager: Saved annotation: { id: ..., signature: ... }`
  - Verify the annotation in Gun.js:
    - Use `/api/debug/annotations?url=https://x.com/DrNeilStone/status/1918363323982332114&annotationId=<id>` (replace `<id>` with the annotation ID from logs).
    - Or connect to the Gun.js node (`annotations_twitter_com` or `annotations_twitter_com_shard_X`) via a Gun.js client.
    - Confirm the `signature` field exists (a string, typically starting with `~`).
- **Expected Outcome**: Annotation is saved with a valid `signature` field, and logs confirm successful signing and storage.
- **Cleanup**: Delete the test annotation via the extension UI or manually set `isDeleted: true` in Gun.js if needed.

#### Test Case 2: Missing Private Key
- **Objective**: Ensure annotation creation fails when the private key is missing, preventing unauthorized writes.
- **Action**:
  - Remove the private key: `chrome.storage.local.remove('privateKey')`.
  - Attempt to create an annotation.
- **Verification**:
  - Check console logs for: `Private key not found. Please authenticate.`
  - Ensure no annotation is saved (check `/api/debug/annotations`).
- **Expected Outcome**: Error prevents unauthorized writes.
- **Cleanup**: Restore the private key: `chrome.storage.local.set({ privateKey: '<original_key>' })`.

#### Test Case 3: Missing DID
- **Objective**: Ensure annotation creation fails when the DID is missing, preventing unauthorized writes.
- **Action**:
  - Remove the DID: `chrome.storage.local.remove('current_did')`.
  - Attempt to create an annotation.
- **Verification**:
  - Check console logs for: `User not authenticated` or `No user DID found. Please authenticate.`
  - Ensure no annotation is saved (check `/api/debug/annotations`).
- **Expected Outcome**: Error prevents unauthorized writes.
- **Cleanup**: Restore the DID by re-authenticating via `SettingsPanel` or importing an identity.

#### Test Case 4: Invalid Private Key
- **Objective**: Ensure annotation creation fails with an invalid private key, preventing invalid signatures.
- **Action**:
  - Set an invalid private key: `chrome.storage.local.set({ privateKey: 'invalid_key' })`.
  - Attempt to create an annotation.
- **Verification**:
  - Check console logs for: `Failed to sign annotation`.
  - Ensure no annotation is saved (check `/api/debug/annotations`).
- **Expected Outcome**: Error prevents invalid signatures.
- **Cleanup**: Restore the original private key: `chrome.storage.local.set({ privateKey: '<original_key>' })`.

#### Test Case 5: Export and Import Identity
- **Objective**: Ensure the private key is preserved via export/import, allowing annotation signing after restoring identity.
- **Action**:
  - Authenticate a user and create an annotation (verify `signature` via `/api/debug/annotations`).
  - Export the identity via `SettingsPanel` (click “Export Identity,” enter a passphrase, save the string).
  - Clear `chrome.storage.local`: `chrome.storage.local.clear()`.
  - Import the identity via `SettingsPanel` (paste the string, enter the passphrase).
  - Create another annotation.
- **Verification**:
  - Check console logs for:
    - `useUserProfile: Imported identity: did:key:...`
    - `AnnotationManager: Saved annotation: { id: ..., signature: ... }`
  - Verify the new annotation in Gun.js (via `/api/debug/annotations`) with the same DID and a valid `signature`.
- **Expected Outcome**: Imported private key allows signing new annotations, maintaining user privileges.
- **Cleanup**: Delete test annotations if needed.

#### Test Case 6: Import with Incorrect Passphrase
- **Objective**: Ensure importing with an incorrect passphrase fails, protecting the private key.
- **Action**:
  - Attempt to import an exported identity with an incorrect passphrase.
- **Verification**:
  - Check console logs or UI for: `Failed to import identity: Incorrect passphrase or corrupted data`.
  - Ensure `did` and `privateKey` are not set: `chrome.storage.local.get(['current_did', 'privateKey'], console.log)`.
- **Expected Outcome**: Protects the private key from unauthorized access.
- **Cleanup**: None required.

## Future Test Suites
- **Server-Side Signature Verification (Step 2)**: Test cases for verifying annotation signatures in `gun-server.js`.
- **Comment Signing and Verification**: Extend signing to comments, ensuring anti-impersonation.
- **Profile Management**: Test profile creation, update, and persistence across devices.
- **Annotation Deletion**: Verify user and admin deletion workflows.

**Notes**:
- Add new test suites as features are implemented.
- Update test cases with results (pass/fail) and notes after execution.
- Include rollback plans for failed tests (e.g., revert to original files).