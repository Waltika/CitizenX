chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.runtime.sendMessage({ action: 'urlChanged', url: changeInfo.url });
        chrome.sidePanel.open({ tabId });
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getCurrentUrl') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            sendResponse({ url: tabs[0].url });
        });
        return true;
    } else if (msg.action === 'requestAnnotations' || msg.action === 'addAnnotation') {
        const iframe = document.getElementById('citizenx-iframe') as HTMLIFrameElement;
        iframe?.contentWindow?.postMessage(msg, 'https://waltika.github.io');
    }
});