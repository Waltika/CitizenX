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

    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

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

export async function encryptPrivateKey(privateKeyBase64: string, passphrase: string) {
    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);

    // Derive a key from the passphrase using PBKDF2
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passphraseData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Encrypt the private key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const privateKeyArray = encoder.encode(privateKeyBase64);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        privateKeyArray
    );

    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
}

export async function decryptPrivateKey(encryptedBase64: string, passphrase: string) {
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);

    // Derive the key from the passphrase
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passphraseData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Decrypt the private key
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        encryptedData
    );

    return new TextDecoder().decode(decrypted);
}