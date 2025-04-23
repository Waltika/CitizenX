// src/utils/crypto.ts
export async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256'
        },
        true, // extractable
        ['sign', 'verify']
    );

    // Export the public key as a string (base64)
    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

    // Export the private key as a string (base64)
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

    return {
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
        rawPublicKey: keyPair.publicKey,
        rawPrivateKey: keyPair.privateKey
    };
}

export async function signMessage(message: string, privateKeyBase64: string) {
    const privateKeyArray = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyArray,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        data
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(message: string, signatureBase64: string, publicKeyBase64: string) {
    const publicKeyArray = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyArray,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
    );

    const signatureArray = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signatureArray,
        data
    );
}