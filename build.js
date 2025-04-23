// build.js
import { build } from 'vite';
import { resolve } from 'path';
import { copyFile, mkdir, rm, rename, readFile, writeFile, readdir } from 'fs/promises';
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

    await rm(tempSidepanelDir, { recursive: true });

    // Copy walletConnector.js for wallet connection (if still used)
    console.log('Copying walletConnector.js...');
    await mkdir(resolve(chromeExtensionDir, 'content'), { recursive: true });
    await copyFile(
        resolve(process.cwd(), 'src/content/walletConnector.js'),
        resolve(chromeExtensionDir, 'content/walletConnector.js')
    );

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
                    entryFileNames: 'assets/index.[hash].js', // Use [hash] for entry file
                    chunkFileNames: 'assets/[name].[hash].js', // Use [hash] for chunks
                    assetFileNames: 'assets/[name].[hash].[ext]', // Use [hash] for other assets
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

    // Find the hashed filename for index.js
    const assetsDir = resolve(tempActiveContentDir, 'assets');
    const files = await readdir(assetsDir);
    const hashedIndexJsFile = files.find(file => file.startsWith('index.') && file.endsWith('.js'));
    if (!hashedIndexJsFile) {
        throw new Error('Could not find hashed index.js in assets directory');
    }
    const hashedIndexJsPath = `/assets/${hashedIndexJsFile}`;
    console.log('Found hashed index.js:', hashedIndexJsPath);

    // Update index.html to reference the correct path
    indexHtmlContent = indexHtmlContent.replace(
        hashedIndexJsPath,
        `/CitizenX/dist/active-content${hashedIndexJsPath}`
    );
    await writeFile(indexHtmlPath, indexHtmlContent);
    await rename(indexHtmlPath, resolve(activeContentDir, 'index.html'));

    // Copy the hashed index.js file and other assets
    await mkdir(resolve(activeContentDir, 'assets'), { recursive: true });
    for (const file of files) {
        await copyFile(
            resolve(assetsDir, file),
            resolve(activeContentDir, 'assets', file)
        );
    }

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