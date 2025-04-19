# CitizenX

A decentralized Chrome extension for annotating websites using Gun.js and Pinata IPFS.

## Setup

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Load in Chrome: `chrome://extensions/`, enable Developer mode, load `dist/`
4. Run tests: `npm test`

## Structure

- `src/background`: Background script (storage, services, utils)
- `src/content`: Content script (DOM interactions)
- `src/popup`: React-based UI
- `src/shared`: Shared types and utilities
- `src/externals`: External content sourcing
- `tests`: Unit and integration tests
- `configs`: Manifest and environment configs
- `public`: Static assets (icons, images)

## Features

- Annotations with comments and votes
- Display names and profile pictures
- Generalized URL normalization
- Visit history with notifications
- Text highlighting
- Structured metadata
- External content sourcing
- Data durability