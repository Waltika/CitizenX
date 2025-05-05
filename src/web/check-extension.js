<script>
    console.log('check-extension: Script running');
    const urlParams = new URLSearchParams(window.location.search);
    const annotationId = urlParams.get('annotationId');
    const targetUrl = "https://" + urlParams.get('url');
    const installUrl = 'https://citizenx.app/install';
    const viewAnnotationsUrl = 'https://citizenx.app/view-annotations'; // Updated to plural
    const homepageUrl = 'https://citizenx.app';
    console.log('check-extension: annotationId=', annotationId, 'targetUrl=', targetUrl);

    function checkExtensionPresence() {
    return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
    const marker = document.getElementById('citizenx-extension-installed');
    if (marker) {
    clearInterval(interval);
    resolve(true);
} else if (attempts >= maxAttempts) {
    clearInterval(interval);
    resolve(false);
}
    attempts++;
}, 100);
});
}

    async function redirect() {
    if (!annotationId || !targetUrl) {
    console.log('check-extension: Invalid parameters, redirecting to homepage');
    window.location.href = homepageUrl;
    return;
}

    // Detect browser: Redirect non-Chrome browsers to /view-annotations
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg') && !userAgent.includes('opr') && !userAgent.includes('samsung');
    console.log('check-extension: isChrome=', isChrome);

    if (!isChrome) {
    console.log('check-extension: Non-Chrome browser, redirecting to', viewAnnotationsUrl);
    window.location.href = `${viewAnnotationsUrl}?annotationId=${annotationId}&url=${encodeURIComponent(targetUrl)}`;
    return;
}

    const isExtensionInstalled = await checkExtensionPresence();
    console.log('check-extension: isExtensionInstalled=', isExtensionInstalled);

    if (isExtensionInstalled) {
    console.log('check-extension: Extension found, redirecting to', targetUrl);
    window.location.href = `${targetUrl}?annotationId=${annotationId}`;
} else {
    console.log('check-extension: Extension not found, redirecting to', installUrl);
    window.location.href = installUrl + `?annotationId=${annotationId}&url=${encodeURIComponent(targetUrl)}`;
}
}

    redirect();
</script>