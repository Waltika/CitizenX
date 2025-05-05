<meta property="og:title" content="CitizenX Annotations" />
<meta property="og:description" content="View these insightful annotations on CitizenX!" />
<meta property="og:url" content="https://citizenx.app/view-annotations" />
<meta property="og:image" content="https://citizenx.app/assets/citizenx-preview.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="CitizenX Annotations" />
<meta name="twitter:description" content="View these insightful annotations on CitizenX!" />
<meta name="twitter:image" content="https://citizenx.app/assets/citizenx-preview.jpg" />

<script>
    const urlParams = new URLSearchParams(window.location.search);
    const annotationId = urlParams.get('annotationId');
    const targetUrl = urlParams.get('url');
    const homepageUrl = 'https://citizenx.app';

    if (!annotationId || !targetUrl) {
    window.location.href = homepageUrl;
} else {
    // Set the annotated page link
    const linkElement = document.getElementById('annotated-page-link');
    if (linkElement) {
    linkElement.href = targetUrl;
    linkElement.textContent = targetUrl;
}

    // Set global variables for the React app
    window.CitizenX = {
    annotationId: annotationId,
    targetUrl: targetUrl
};
}
</script>
<script src="/assets/annotation-ui.bundle.js"></script>