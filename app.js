// Debug: Log script start
console.log('Annotation app.js: Script started');

// Simple UUID generator for anonymous users
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Preserve text selection
let preservedSelection = null;
let preservedText = '';
function saveSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    preservedSelection = selection.getRangeAt(0);
    preservedText = selection.toString();
    console.log('Annotation app.js: Selection saved:', preservedText);
  } else {
    console.log('Annotation app.js: No selection to save');
  }
}
function restoreSelection() {
  if (preservedSelection) {
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(preservedSelection);
      console.log('Annotation app.js: Selection restored:', selection.toString());
    } catch (err) {
      console.error('Annotation app.js: Failed to restore selection:', err);
      preservedSelection = null;
    }
  } else {
    console.log('Annotation app.js: No selection to restore');
  }
}
saveSelection(); // Save selection before DOM changes

// Create container for React app
const rootDiv = document.createElement('div');
rootDiv.id = 'annotation-app';
document.body.appendChild(rootDiv);
console.log('Annotation app.js: Root div created');

// CSS to ensure UI visibility
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
    min-width: 300px !important;
    min-height: 200px !important;
    z-index: 999999 !important;
    font-family: Arial, sans-serif !important;
    display: block !important;
  }
  #annotation-app textarea {
    width: 100% !important;
    padding: 8px !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    margin-bottom: 8px !important;
    min-height: 60px !important;
    box-sizing: border-box !important;
  }
  #annotation-app button {
    width: 100% !important;
    background: #3b82f6 !important;
    color: white !important;
    padding: 8px !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-size: 14px !important;
  }
  #annotation-app button:hover {
    background: #2563eb !important;
  }
  #annotation-app ul {
    max-height: 160px !important;
    overflow-y: auto !important;
    margin-bottom: 16px !important;
    padding: 0 !important;
    list-style: none !important;
  }
  #annotation-app .error {
    color: red !important;
    font-size: 12px !important;
    margin-bottom: 8px !important;
  }
  #annotation-app h2 {
    font-size: 18px !important;
    font-weight: bold !important;
    margin-bottom: 8px !important;
  }
  #annotation-app p {
    font-size: 14px !important;
    margin-bottom: 8px !important;
  }
  #annotation-app li {
    margin-bottom: 8px !important;
  }
  #annotation-app .selected-text {
    background: #e0f7fa !important;
    padding: 4px !important;
    border-radius: 4px !important;
    margin-bottom: 8px !important;
    font-size: 14px !important;
  }
`;
document.head.appendChild(style);
console.log('Annotation app.js: Styles appended');

// Load dependencies
const scripts = [
  'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js',
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

// Main app code
function renderApp() {
  console.log('Annotation app.js: Rendering app');
  try {
    // Initialize Gun.js
    const gun = GUN({
      peers: ['https://gun-manhattan.herokuapp.com/gun']
    });
    console.log('Annotation app.js: Gun.js initialized');

    // IPFS Configuration (using Pinata)
    const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMDJhZjU4Yi1hMWU4LTRmOWUtOWYxYy03MDIxYzU5ZWQyY2YiLCJlbWFpbCI6IndhbHRlci53YXJ0ZW53ZWlsZXJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImEyNjMxMzAyYjU5ZDJmZjExOGZiIiwic2NvcGVkS2V5U2VjcmV0IjoiMDMxZDMwNTViODliNDA2ZjUyOTRjYzU1Nzk0NzIwNjRmZjNlMjk3MzVmNmVkYTVjYWIxNDhiZmY1YmQ4MzVhZCIsImV4cCI6MTc3NjUyOTQwN30.drqZMCA4Va5_-BFfsfPa83geywC5ftU9f7IOlZvRj7I'; // Replace with your Pinata JWT
    async function uploadToIPFS(data) {
      try {
        const formData = new FormData();
        formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        console.log('Annotation app.js: Sending Pinata upload request');
        const response = await fetch(`${PINATA_API_URL}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${PINATA_JWT}`,
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const result = await response.json();
        console.log('Annotation app.js: Pinata upload CID:', result.IpfsHash);
        return result.IpfsHash;
      } catch (err) {
        console.error('Annotation app.js: Pinata upload failed:', err);
        throw err;
      }
    }

    async function fetchFromIPFS(cid) {
      try {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        if (!response.ok) {
          throw new Error(`Pinata fetch failed: ${response.statusText}`);
        }
        return await response.json();
      } catch (err) {
        console.error('Annotation app.js: Pinata fetch failed:', err);
        throw err;
      }
    }

    // Annotation Component
    function AnnotationApp() {
      const [annotations, setAnnotations] = React.useState([]);
      const [newAnnotation, setNewAnnotation] = React.useState('');
      const [userId, setUserId] = React.useState(null);
      const [isMetaMask, setIsMetaMask] = React.useState(false);
      const [error, setError] = React.useState('');
      const [selectedText, setSelectedText] = React.useState(preservedText);

      // Initialize user ID
      React.useEffect(() => {
        console.log('Annotation app.js: Initializing user');
        let isMounted = true;
        const initUser = async () => {
          try {
            if (window.ethereum) {
              const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
              if (isMounted) {
                setUserId(accounts[0]);
                setIsMetaMask(true);
                console.log('Annotation app.js: MetaMask connected:', accounts[0]);
              }
            } else {
              throw new Error('No MetaMask');
            }
          } catch (err) {
            if (isMounted) {
              console.log('Annotation app.js: Falling back to anonymous ID');
              let anonId = localStorage.getItem('anonId');
              if (!anonId) {
                anonId = generateUUID();
                localStorage.setItem('anonId', anonId);
              }
              setUserId(anonId);
              console.log('Annotation app.js: Anonymous ID:', anonId);
            }
          }
        };
        initUser();
        return () => {
          isMounted = false;
          console.log('Annotation app.js: User initialization cleanup');
        };
      }, []);

      // Restore selection and update selected text
      React.useEffect(() => {
        restoreSelection();
        const selection = window.getSelection();
        if (selection.toString()) {
          setSelectedText(selection.toString());
        }
        const textarea = document.querySelector('#annotation-app textarea');
        if (textarea) {
          textarea.addEventListener('focus', () => {
            saveSelection(); // Save before losing focus
          });
          textarea.addEventListener('blur', () => {
            restoreSelection(); // Restore after typing
            if (!window.getSelection().toString() && selectedText) {
              console.log('Annotation app.js: Selection lost, using stored text:', selectedText);
            }
          });
        }
        return () => {
          if (textarea) {
            textarea.removeEventListener('focus', saveSelection);
            textarea.removeEventListener('blur', restoreSelection);
          }
        };
      }, []);

      // Load annotations
      React.useEffect(() => {
        if (userId) {
          console.log('Annotation app.js: Loading annotations for URL:', window.location.href);
          const currentUrl = window.location.href;
          gun.get('annotations').get(currentUrl).map().on(async (data, id) => {
            if (data) {
              try {
                let annotationData = data;
                if (data.cid) {
                  annotationData = await fetchFromIPFS(data.cid);
                }
                setAnnotations(prev => {
                  const exists = prev.find(a => a.id === id);
                  if (!exists) return [...prev, { id, ...annotationData }];
                  return prev.map(a => (a.id === id ? { id, ...annotationData } : a));
                });
                console.log('Annotation app.js: Loaded annotation:', id);
              } catch (err) {
                console.error('Annotation app.js: Failed to fetch from IPFS:', err);
              }
            }
          });
        }
      }, [userId]);

      // Handle annotation
      const handleAnnotate = async () => {
        console.log('Annotation app.js: Attempting to annotate');
        const selection = window.getSelection();
        let textToAnnotate = selection.toString() || selectedText;
        if (!textToAnnotate) {
          setError('Please select some text to annotate.');
          console.log('Annotation app.js: No text selected');
          return;
        }
        if (!newAnnotation) {
          setError('Please enter an annotation note.');
          console.log('Annotation app.js: No note entered');
          return;
        }
        if (userId) {
          const currentUrl = window.location.href;
          const annotation = {
            text: textToAnnotate,
            note: newAnnotation,
            user: userId,
            isMetaMask,
            timestamp: Date.now()
          };
          try {
            let cid;
            try {
              cid = await uploadToIPFS(annotation);
            } catch (ipfsErr) {
              console.warn('Annotation app.js: IPFS upload failed, falling back to Gun.js:', ipfsErr);
              const id = `${userId}-${Date.now()}`;
              gun.get('annotations').get(currentUrl).get(id).put(annotation);
              setNewAnnotation('');
              setError('');
              setSelectedText('');
              selection.removeAllRanges();
              console.log('Annotation app.js: Annotation saved to Gun.js:', id);
              return;
            }
            const id = `${userId}-${Date.now()}`;
            gun.get('annotations').get(currentUrl).get(id).put({ cid });
            setNewAnnotation('');
            setError('');
            setSelectedText('');
            selection.removeAllRanges();
            console.log('Annotation app.js: Annotation saved with IPFS:', id);
          } catch (err) {
            setError('Failed to save annotation. Please try again.');
            console.error('Annotation app.js: Annotation save failed:', err);
          }
        }
      };

      console.log('Annotation app.js: Rendering component, userId:', userId);

      // Render using createElement
      return React.createElement(
        'div',
        { id: 'annotation-app' },
        userId
          ? [
              React.createElement(
                'p',
                { className: 'text-sm mb-2', key: 'user' },
                isMetaMask ? `Connected: ${userId.slice(0, 6)}...` : 'Anonymous User'
              ),
              selectedText && React.createElement(
                'p',
                { className: 'selected-text', key: 'selected' },
                `Selected: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`
              ),
              error && React.createElement('p', { className: 'error', key: 'error' }, error),
              React.createElement('h2', { className: 'text-lg font-bold mb-2', key: 'title' }, 'Annotations'),
              React.createElement(
                'ul',
                { key: 'annotations' },
                annotations.map(ann =>
                  React.createElement(
                    'li',
                    { key: ann.id, className: 'mb-2' },
                    React.createElement(
                      'p',
                      { className: 'text-sm' },
                      React.createElement(
                        'strong',
                        null,
                        ann.isMetaMask ? `${ann.user.slice(0, 6)}...` : 'Anonymous'
                      ),
                      `: "${ann.text}"`
                    ),
                    React.createElement('p', { className: 'text-xs' }, ann.note)
                  )
                )
              ),
              React.createElement('textarea', {
                placeholder: 'Add annotation',
                value: newAnnotation,
                onChange: e => setNewAnnotation(e.target.value),
                key: 'textarea'
              }),
              React.createElement(
                'button',
                { onClick: handleAnnotate, key: 'button' },
                'Annotate Selection'
              )
            ]
          : React.createElement('p', { className: 'error' }, 'Initializing user...')
      );
    }

    // Render the app with React 18 createRoot
    console.log('Annotation app.js: Creating root');
    const container = document.querySelector('#annotation-app');
    if (container) {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(AnnotationApp));
      console.log('Annotation app.js: Render completed');
      restoreSelection();
    } else {
      console.error('Annotation app.js: Render failed: #annotation-app not found');
      rootDiv.innerHTML = `
        <div style="position: fixed; bottom: 16px; right: 16px; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 384px; min-width: 300px; min-height: 200px; z-index: 999999; font-family: Arial, sans-serif;">
          <p style="color: red;">Failed to load annotation app: Container not found.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Annotation app.js: Render failed:', err);
    rootDiv.innerHTML = `
      <div style="position: fixed; bottom: 16px; right: 16px; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 384px; min-width: 300px; min-height: 200px; z-index: 999999; font-family: Arial, sans-serif;">
        <p style="color: red;">Failed to load annotation app. Please try again.</p>
      </div>
    `;
  }
}