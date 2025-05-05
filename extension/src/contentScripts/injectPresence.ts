// src/contentScripts/injectPresence.ts
console.log('injectPresence: Running');
function injectMarker() {
    if (document.body) {
        console.log('injectPresence: Injecting marker');
        const marker = document.createElement('div');
        marker.id = 'citizenx-extension-installed';
        marker.style.display = 'none';
        document.body.appendChild(marker);
    } else {
        console.log('injectPresence: document.body not ready, retrying');
        setTimeout(injectMarker, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMarker);
} else {
    injectMarker();
}