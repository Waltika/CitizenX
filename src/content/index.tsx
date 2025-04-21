import { createRoot } from 'react-dom/client';
import { AnnotationCreate } from './components/AnnotationCreate';

function initializeContentScript() {
    const container = document.createElement('div');
    container.id = 'citizenx-content-root';
    document.body.appendChild(container);

    const userId = localStorage.getItem('userAddress') || 'anonymous';

    chrome.runtime.sendMessage({ action: 'getCurrentUrl' }, (response) => {
        if (response && response.url) {
            const root = createRoot(container);
            root.render(<AnnotationCreate url={response.url} userId={userId} />);
        } else {
            console.error('Failed to get current URL');
        }
    });
}

initializeContentScript();