// build.js
import { build } from 'vite';
import { resolve } from 'path';
import { copyFile, mkdir, rm, rename, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const chromeExtensionDir = resolve(process.cwd(), 'dist/chrome-extension');
const activeContentDir = resolve(process.cwd(), 'dist/active-content');

async function clean() {
    console.log('Cleaning dist directories...');
    if (existsSync(chromeExtensionDir)) {
        await rm(chromeExtensionDir, { recursive: true });
    }
    if (existsSync(activeContentDir)) {
        await rm(activeContentDir, { recursive: true });
    }
}

async function copyStaticFiles() {
    console.log('Copying static files...');
    await mkdir(resolve(chromeExtensionDir, 'icons'), { recursive: true });
    await copyFile(resolve(process.cwd(), 'icons/icon16.png'), resolve(chromeExtensionDir, 'icons/icon16.png'));
    await copyFile(resolve(process.cwd(), 'icons/icon32.png'), resolve(chromeExtensionDir, 'icons/icon32.png'));
    await copyFile(resolve(process.cwd(), 'icons/icon128.png'), resolve(chromeExtensionDir, 'icons/icon128.png'));
    await copyFile(resolve(process.cwd(), 'manifest.json'), resolve(chromeExtensionDir, 'manifest.json'));
}

async function buildChromeExtension() {
    await mkdir(chromeExtensionDir, { recursive: true });

    // Build sidepanel
    console.log('Building sidepanel...');
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
                input: resolve(process.cwd(), 'src/sidepanel/index.html'),
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
            base: './',
        },
    });
    await mkdir(resolve(chromeExtensionDir, 'sidepanel'), { recursive: true });
    await copyFile(resolve(tempSidepanelDir, 'index.js'), resolve(chromeExtensionDir, 'sidepanel/index.js'));
    const indexHtmlPath = resolve(tempSidepanelDir, 'src/sidepanel/index.html');
    let indexHtmlContent = await readFile(indexHtmlPath, 'utf-8');
    indexHtmlContent = indexHtmlContent.replace('src="/index.js"', 'src="index.js"');
    await writeFile(indexHtmlPath, indexHtmlContent);
    await copyFile(indexHtmlPath, resolve(chromeExtensionDir, 'sidepanel/index.html'));

    // Copy loader.html
    console.log('Copying loader.html...');
    await copyFile(
        resolve(process.cwd(), 'src/sidepanel/loader.html'),
        resolve(chromeExtensionDir, 'sidepanel/loader.html')
    );

    // Copy loader.js
    console.log('Copying loader.js...');
    await copyFile(
        resolve(process.cwd(), 'src/sidepanel/loader.js'),
        resolve(chromeExtensionDir, 'sidepanel/loader.js')
    );

    await rm(tempSidepanelDir, { recursive: true });

    // Copy background.js
    console.log('Copying background.js...');
    await copyFile(
        resolve(process.cwd(), 'src/background.js'),
        resolve(chromeExtensionDir, 'background.js')
    );
}

async function buildActiveContent() {
    console.log('Building active-content...');
    const tempActiveContentDir = resolve(process.cwd(), 'temp-active-content');
    if (existsSync(tempActiveContentDir)) {
        await rm(tempActiveContentDir, { recursive: true });
    }
    const basePath = '/CitizenX/dist/active-content/';
    console.log('Base path for active-content:', basePath);
    await build({
        configFile: false,
        plugins: [(await import('@vitejs/plugin-react')).default()],
        resolve: {
            alias: {
                'events': 'events',
            },
        },
        build: {
            outDir: tempActiveContentDir,
            rollupOptions: {
                input: resolve(process.cwd(), 'src/sidepanel/index.html'),
                output: {
                    entryFileNames: 'assets/index.js',
                    chunkFileNames: 'assets/[name].js',
                    assetFileNames: 'assets/[name].[ext]',
                },
            },
            base: basePath,
            assetsDir: 'assets',
            chunkSizeWarningLimit: 2000,
            minify: true,
        },
    });
    await mkdir(activeContentDir, { recursive: true });
    const indexHtmlPath = resolve(tempActiveContentDir, 'src/sidepanel/index.html');
    let indexHtmlContent = await readFile(indexHtmlPath, 'utf-8');
    indexHtmlContent = indexHtmlContent.replace(
        '/assets/index.js',
        '/CitizenX/dist/active-content/assets/index.js'
    );
    await writeFile(indexHtmlPath, indexHtmlContent);
    await rename(indexHtmlPath, resolve(activeContentDir, 'index.html'));
    await mkdir(resolve(activeContentDir, 'assets'), { recursive: true });
    await copyFile(
        resolve(tempActiveContentDir, 'assets/index.js'),
        resolve(activeContentDir, 'assets/index.js')
    );
    await rm(tempActiveContentDir, { recursive: true });
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