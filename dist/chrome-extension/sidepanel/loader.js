// src/sidepanel/loader.js
document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('sidepanel-frame');
    const baseUrl = 'https://waltika.github.io/CitizenX/dist/active-content/index.html';
    iframe.src = `${baseUrl}?t=${Date.now()}`;
});