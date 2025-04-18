// Debug: Log script start
console.log('Annotation app.js: Script started');

// Simple UUID generator for anonymous users
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Create container for React app with shadow DOM
const rootDiv = document.createElement('div');
rootDiv.id = 'annotation-root';
const shadowRoot = rootDiv.attachShadow({ mode: 'open' });
const appContainer = document.createElement('div');
shadowRoot.appendChild(appContainer);
document.body.appendChild(rootDiv);
console.log('Annotation app.js: Root div and shadow DOM created');

// Load dependencies
const scripts = [
  'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7.20.15/babel.min.js',
  'https://cdn.jsdelivr.net/npm/gun@0.2020.1236/gun.min.js',
  'https://cdn.jsdelivr.net/npm/gun/sea.js',
  'https://cdn.tailwindcss.com'
];

let loadedScripts = 0;
scripts.forEach(src => {
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.onload = () => {
    console.log(`Annotation app.js: Loaded ${src}`);
    loadedScripts++;
    if (loadedScripts === scripts.length) {
      console.log('Annotation app.js: All dependencies loaded');
      renderApp();
    }
  };
  script.onerror = () => console.error(`Annotation app.js: Failed to load ${src}`);
  document.head.appendChild(script);
});

// Fallback CSS to ensure UI visibility
const style = document.createElement('style');
style.textContent = `
  #annotation-app {
    position: fixed !important;
    bottom: 16px !important;
    right: 16px !important;
    background: white !important;
    padding: 16px !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    max-width: 384px !important;
    z-index: 999999 !important;
    font-family: Arial, sans-serif !important;
  }
  #annotation-app textarea {
    width: 100% !important;
    padding: 8px !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    margin-bottom: 8px !important;
  }
  #annotation-app button {
    width: 100% !important;
    background: #3b82f6 !important;
    color: white !important;
    padding: 8px !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
  }
  #annotation-app button:hover {
    background: #2563eb !important;
  }
  #annotation-app ul {
    max-height: 160px !important;
    overflow-y: auto !important;
    margin-bottom: 16px !important;
  }
  #annotation-app p.error {
    color: red !important;
    font-size: 12px !important;
    margin-bottom: 8px !important;
  }
`;
shadowRoot.appendChild(style);

// Main app code
function renderApp() {
  console.log('Annotation app.js: Rendering app');
  try {
    const appCode = `
      const { useState, useEffect } = React;

      // Initialize Gun.js with public peers
      const gun = GUN({
        peers: ['https://gun-manhattan.herokuapp.com/gun']
      });

      // IPFS Configuration
      const IPFS_API_URL = 'https://ipfs.infura.io:5001/api/v0';
      async function uploadToIPFS(data) {
        try {
          const formData = new FormData();
          formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
          const response = await fetch(\`\${IPFS_API_URL}/add\`, {
            method: 'POST',
            body: formData
          });
          const result = await response.json();
          console.log('Annotation app.js: IPFS upload CID:', result.Hash);
          return result.Hash;
        } catch (err) {
          console.error('Annotation app.js: IPFS upload failed:', err);
          throw err;
        }
      }

      async function fetchFromIPFS(cid) {
        try {
          const response