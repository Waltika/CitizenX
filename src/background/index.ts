// src/background/index.ts
import { annotationService } from './services/annotations';
import { authService } from './services/auth';
import { historyService } from './services/history';
import { notificationService } from './services/notifications';
import { profileService } from './services/profiles';

console.log('CitizenX background service worker initialized');

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked, tab:', tab);
    if (tab.id) {
        chrome.sidePanel.open(
            { tabId: tab.id },
            () => {
                if (chrome.runtime.lastError) {
                    console.error('Error opening side panel on click:', chrome.runtime.lastError);
                } else {
                    console.log('Side panel opened for tab:', tab.id);
                }
            }
        );
    } else {
        console.warn('No tab ID available for side panel open');
    }
});

// Open side panel on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active && tab.id) {
        console.log('Tab updated, opening side panel for tab:', tabId);
        chrome.sidePanel.open(
            { tabId },
            () => {
                if (chrome.runtime.lastError) {
                    console.error('Error opening side panel on tab update:', chrome.runtime.lastError);
                } else {
                    console.log('Side panel opened for tab:', tabId);
                }
            }
        );
    }
});

// Handle messages for annotations
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'addAnnotation') {
        console.log('Received addAnnotation message:', message.data);
        annotationService.addAnnotation(message.data).then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('Annotation error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep channel open for async response
    }
});