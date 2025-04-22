import { build } from 'vite';
import { resolve } from 'path';
import { copyFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';

const chromeExtensionDir = resolve(process.cwd(), 'dist/chrome-extension');
const activeContentDir = resolve(process.cwd(), 'dist/active-content');

async function clean() {
    if (existsSync(chromeExtensionDir)) {
        await rm(chromeExtensionDir, { recursive: true });
    }
    if (existsSync(activeContentDir)) {
        await rm(activeContentDir, { recursive: true });
    }
}

async function copyStaticFiles() {
    await mkdir(resolve(chromeExtensionDir, 'icons'), { recursive: true });
    await copyFile(resolve(process.cwd(), 'icons/icon16.png'), resolve(chromeExtensionDir, 'icons/icon16.png'));
    await copyFile(resolve(process.cwd(), 'icons/icon32.png'), resolve(chromeExtensionDir, 'icons/icon32.png'));
    await copyFile(resolve(process.cwd(), 'icons/icon128.png'), resolve(chromeExtensionDir, 'icons/icon128.png'));
    await copyFile(resolve(process.cwd(), 'manifest.json'), resolve(chromeExtensionDir, 'manifest.json'));
}

async function buildChromeExtension() {
    await mkdir(chromeExtensionDir, { recursive: true });

    // Build sidepanel
    const tempSidepanelDir = resolve(process.cwd(), 'temp-sidepanel');
    if (existsSync(tempSidepanelDir)) {
        await rm(tempSidepanelDir, { recursive: true });
    }
    await build({
        configFile: false,
        plugins: [(await import('@vitejs/plugin-react')).default()],
        resolve: {
            alias: {
                'events': 'events',
            },
        },
        build: {
            outDir: tempSidepanelDir,
            rollupOptions: {
                input: {
                    sidepanel: resolve(process.cwd(), 'src/sidepanel/index.html'),
                },
                output: {
                    entryFileNames: 'index.js',
                    assetFileNames: 'assets/[name]-[hash].[ext]',
                    format: 'iife',
                    inlineDynamicImports: false,
                    preserveModules: false,
                    manualChunks: () => undefined,
                    compact: true,
                    interop: 'compat',
                },
            },
        },
    });
    await mkdir(resolve(chromeExtensionDir, 'sidepanel'), { recursive: true });
    await copyFile(resolve(tempSidepanelDir, 'index.js'), resolve(chromeExtensionDir, 'sidepanel/index.js'));
    await copyFile(resolve(tempSidepanelDir, 'src/sidepanel/index.html'), resolve(chromeExtensionDir, 'sidepanel/index.html'));
    await rm(tempSidepanelDir, { recursive: true });

    // Build content script
    const tempContentDir = resolve(process.cwd(), 'temp-content');
    if (existsSync(tempContentDir)) {
        await rm(tempContentDir, { recursive: true });
    }
    await build({
        configFile: false,
        plugins: [(await import('@vitejs/plugin-react')).default()],
        resolve: {
            alias: {
                'events': 'events',
            },
        },
        build: {
            outDir: tempContentDir,
            rollupOptions: {
                input: {
                    content: resolve(process.cwd(), 'src/content/index.tsx'),
                },
                output: {
                    entryFileNames: 'index.js',
                    format: 'iife',
                    inlineDynamicImports: false,
                    preserveModules: false,
                    manualChunks: () => undefined,
                    compact: true,
                    interop: 'compat',
                },
            },
        },
    });
    await mkdir(resolve(chromeExtensionDir, 'content'), { recursive: true });
    await copyFile(resolve(tempContentDir, 'index.js'), resolve(chromeExtensionDir, 'content/index.js'));
    await rm(tempContentDir, { recursive: true });
}

async function buildActiveContent() {
    await build({
        configFile: false,
        plugins: [(await import('@vitejs/plugin-react')).default()],
        resolve: {
            alias: {
                'events': 'events',
            },
        },
        build: {
            outDir: activeContentDir,
            rollupOptions: {
                input: {
                    index: resolve(process.cwd(), 'src/sidepanel/index.html'),
                },
                output: {
                    entryFileNames: 'assets/index.js',
                    chunkFileNames: 'assets/[name].js',
                    assetFileNames: 'assets/[name].[ext]',
                },
            },
        },
        base: '/CitizenX/active-content/',
    });
}

async function main() {
    await clean();
    await Promise.all([
        copyStaticFiles(),
        buildChromeExtension(),
        buildActiveContent(),
    ]);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});