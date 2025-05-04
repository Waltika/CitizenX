// src/contentScripts/highlightAnnotation.ts
import { normalizeUrl } from '../../../shared/src/utils/normalizeUrl';

const urlParams = new URLSearchParams(window.location.search);
const annotationId = urlParams.get('annotationId');

if (annotationId) {
    chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_ANNOTATION',
        annotationId,
        url: normalizeUrl(window.location.href),
    });
}