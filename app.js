// Simple UUID generator for anonymous users
function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Create container for React app
const rootDiv = document.createElement('div');
rootDiv.id = 'annotation-root';
document.body.appendChild(rootDiv);

// Load dependencies (React, Gun.js, etc.) via script tags
const scripts = [
  'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7.20.15/babel.min.js',
  'https://cdn.jsdelivr.net/npm/gun@0.2020.1236/gun.min.js',
  'https://cdn.jsdelivr.net/npm/gun/sea.js',
  'https://cdn.tailwindcss.com'
];

scripts.forEach(src => {
  const script = document.createElement('script');
  script.src = src;
  script.async = false; // Ensure scripts load in order
  document.head.appendChild(script);
});

// Main app code
const appCode = `
  const { useState, useEffect } = React;

  // Initialize Gun.js with public peers
  const gun = GUN({
    peers: ['https://gun-manhattan.herokuapp.com/gun']
  });

  // IPFS Configuration (using Infura HTTP API)
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
      return result.Hash; // Return CID
    } catch (err) {
      console.error('IPFS upload failed:', err);
      throw err;
    }
  }

  async function fetchFromIPFS(cid) {
    try {
      const response = await fetch(\`https://ipfs.infura.io/ipfs/\${cid}\`);
      return await response.json();
    } catch (err) {
      console.error('IPFS fetch failed:', err);
      throw err;
    }
  }

  // Annotation Component
  function AnnotationApp() {
    const [annotations, setAnnotations] = useState([]);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [userId, setUserId] = useState(null);
    const [isMetaMask, setIsMetaMask] = useState(false);
    const [error, setError] = useState('');

    // Initialize user ID (MetaMask or anonymous)
    useEffect(() => {
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_requestAccounts' })
          .then(accounts => {
            setUserId(accounts[0]);
            setIsMetaMask(true);
          })
          .catch(err => {
            console.error('MetaMask connection failed:', err);
            let anonId = localStorage.getItem('anonId');
            if (!anonId) {
              anonId = generateUUID();
              localStorage.setItem('anonId', anonId);
            }
            setUserId(anonId);
          });
      } else {
        let anonId = localStorage.getItem('anonId');
        if (!anonId) {
          anonId = generateUUID();
          localStorage.setItem('anonId', anonId);
        }
        setUserId(anonId);
      }
    }, []);

    // Load annotations for current URL
    useEffect(() => {
      const currentUrl = window.location.href;
      gun.get('annotations').get(currentUrl).map().on(async (data, id) => {
        if (data && data.cid) {
          try {
            const annotationData = await fetchFromIPFS(data.cid);
            setAnnotations(prev => {
              const exists = prev.find(a => a.id === id);
              if (!exists) return [...prev, { id, ...annotationData }];
              return prev.map(a => (a.id === id ? { id, ...annotationData } : a));
            });
          } catch (err) {
            console.error('Failed to fetch from IPFS:', err);
          }
        }
      });
    }, []);

    // Handle text selection and annotation
    const handleAnnotate = async () => {
      const selection = window.getSelection();
      if (!selection.toString()) {
        setError('Please select some text to annotate.');
        return;
      }
      if (!newAnnotation) {
        setError('Please enter an annotation note.');
        return;
      }
      if (userId) {
        const currentUrl = window.location.href;
        const annotation = {
          text: selection.toString(),
          note: newAnnotation,
          user: userId,
          isMetaMask,
          timestamp: Date.now()
        };
        try {
          const cid = await uploadToIPFS(annotation);
          const id = \`\${userId}-\${Date.now()}\`;
          gun.get('annotations').get(currentUrl).get(id).put({ cid });
          setNewAnnotation('');
          setError('');
          selection.removeAllRanges();
        } catch (err) {
          setError('Failed to save annotation. Please try again.');
        }
      }
    };

    return (
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-sm z-50">
        {userId ? (
          <div>
            <p className="text-sm mb-2">
              {isMetaMask ? \`Connected: \${userId.slice(0, 6)}...\` : 'Anonymous User'}
            </p>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <h2 className="text-lg font-bold mb-2">Annotations</h2>
            <ul className="mb-4 max-h-40 overflow-y-auto">
              {annotations.map(ann => (
                <li key={ann.id} className="mb-2">
                  <p className="text-sm">
                    <strong>{ann.isMetaMask ? ann.user.slice(0, 6) + '...' : 'Anonymous'}:</strong> "{ann.text}"
                  </p>
                  <p className="text-xs">{ann.note}</p>
                </li>
              ))}
            </ul>
            <textarea
              className="w-full p-2 border rounded mb-2"
              placeholder="Add annotation"
              value={newAnnotation}
              onChange={e => setNewAnnotation(e.target.value)}
            />
            <button
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              onClick={handleAnnotate}
            >
              Annotate Selection
            </button>
          </div>
        ) : (
          <p className="text-red-500">Initializing user...</p>
        )}
      </div>
    );
  }

  // Render the app
  ReactDOM.render(<AnnotationApp />, document.getElementById('annotation-root'));
`;

// Inject and execute the app code after dependencies load
const script = document.createElement('script');
script.setAttribute('type', 'text/babel');
script.textContent = appCode;
document.head.appendChild(script);