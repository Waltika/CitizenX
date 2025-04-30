# CitizenX

A decentralized Chrome extension for annotating websites in order to bring a knowledge layer on top of the internet.

## Requirements - v1.0
1. We want the user to be unique and the same if he changes device, clears his browser data, or loses his device.
2. We want the user to have a profile picture and a handle.
3. We want pages from different languages and with non-functional parameters (like UTM parameters) to be considered the same page.
4. We want the Chrome extension to maintain a list of the history of pages visited by the user.
5. We want the user to be notified through the extension when annotations are made by someone else on the pages he visited.
6. We want the user to be notified through the extension when comments are made on his annotation.
7. We want the comments to be a thread under the annotation.
8. We want the persistence to be decentralized using IPFS.
9. We want the notifications and other collaborative features to not rely on a centralized server.
10. We want users to share annotations on social media (e.g., Twitter, Facebook), messaging platforms (e.g., WhatsApp), or other channels to attract new users. The sharing mechanism should optimize for social media reach by including engaging text or images (e.g., annotation snippets or screenshots) while providing a link that first checks if the CitizenX extension is installed. If installed, the link navigates to the annotated page; if not, it directs to an installation page (e.g., Chrome Web Store or CitizenX website).

## Non Functional Requirements - v1.0
1. Except for the Chrome Extension, we want zero installation on the user's device.
2. We want it 100% serverless, storing data on IPFS.
3. We want the authentication to also be decentralized.
4. We want to ensure as much as possible zero loss of data in case of network issues or other failures.
5. We want the Chrome extension to be minimal in terms of content, with all code bundled locally to comply with Chrome Web Store policies (updated from serving content from a `github.io` page, which is not allowed).
6. We want to secure the JWT tokens and other access technologies against hacking.
7. Add privacy policy to manifest.json once we have a website:   "privacy_policy": "https://yourwebsite.com/privacy-policy"

## Requirements - Future Versions
1. We want a crypto/ledger-based ownership structure for the project.
2. We want a crypto-based system for paying contributors, users (if there is profit), and any other connected systems as needed.
3. We want a system allowing users to share annotations on social platforms, messages, and emails for growth hacking.
4. We want to enrich annotations with structured data, allowing complex reasoning on them.
5. We want to use a WYSIWYG editor for annotations (but not comments).
6. We want an AI-powered feature to extract structured information from annotations and comments, defined in a JSON format shared between users. Users can create their own extraction schemas, suggest schemas to the community, and the community can vote to adopt schemas if there’s sufficient interest.

## Non Functional Requirements - Future Versions
1. Add a pinning service—most probably our own but distributed among willing users, incentivizing them in a crypto-based way.
2. Restructure the Gun organization so that not every user replicates all annotations from the whole world, but only those from pages they visited (or visit now) and pages they annotated.
3. Ensure compliance with Chrome Manifest V3 requirements:
   - Use `background.service_worker` instead of persistent background pages, adapting to the service worker lifecycle (e.g., stateless design, persistence via `chrome.storage`).
   - Avoid `eval`, `new Function`, and other dynamic code execution methods.
   - Define a strict Content Security Policy (CSP) in `manifest.json` (e.g., `script-src 'self'; object-src 'self'`), prohibiting inline scripts and external code fetching.
   - Use the `action` API for toolbar interactions (replacing `browserAction` and `pageAction`).
4. Minimize permissions to reduce user friction and comply with Chrome Web Store policies:
   - Use specific `host_permissions` where possible, avoiding broad permissions like `<all_urls>` unless necessary.
   - Implement optional permissions (`optional_host_permissions`) to allow users to grant access to specific domains on-demand.
   - Provide clear justifications for all permissions in the Chrome Web Store listing.
5. Optimize performance to avoid degrading the browser experience:
   - Design service workers to handle termination after 30 seconds (or up to 5 minutes for certain APIs), using `chrome.storage` for state persistence.
   - Optimize content scripts by using `run_at: "document_idle"` and limiting DOM manipulation.
   - Keep the extension bundle size under 100 MB (compressed) and 200 MB (uncompressed), leveraging tree-shaking with Vite.
6. Enhance security to protect users and comply with Chrome policies:
   - Use HTTPS for all network requests (e.g., fetching data from `github.io`).
   - Sanitize user input (e.g., annotations, comments) to prevent XSS attacks, using a library like DOMPurify.
   - Avoid broad permissions that could lead to security concerns or user distrust.
7. Ensure a good user experience to avoid user frustration and Chrome Web Store flags:
   - Use non-intrusive UI elements (e.g., side panel, `chrome.notifications`) instead of popups or alerts.
   - Support internationalization (i18n) using Chrome’s `i18n` API if targeting a global audience.
   - Ensure accessibility (a11y) in the UI (e.g., ARIA attributes, keyboard navigation).
8. Prepare for Chrome Web Store review process:
   - Avoid obfuscated or unreadable code, providing source maps if minification is used.
   - Clearly document data sharing (e.g., via Gun) in the privacy policy and obtain user consent if necessary.
   - Ensure the extension provides meaningful functionality and avoids unexpected behavior (e.g., no ads, no unauthorized tracking).
9. Manage storage limits for scalability:
   - Request the `unlimitedStorage` permission if large data storage is needed (e.g., for annotations in `localStorage`).
   - Offload data to Gun for peer-to-peer storage, ensuring data is pinned to prevent loss.