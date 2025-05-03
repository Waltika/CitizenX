## Future Versions

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

**Status**: Planned, to be implemented later.