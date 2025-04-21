import { build } from 'vite';
import { resolve, join } from 'path';
import { copyFileSync, existsSync, rmSync, mkdirSync, readdirSync } from 'fs';

async function runBuild() {
    const distDir = resolve(process.cwd(), 'dist');
    const tempSidepanelDir = resolve(process.cwd(), 'temp-sidepanel');
    const tempContentDir = resolve(process.cwd(), 'temp-content');

    // Clean up previous build artifacts
    if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
    if (existsSync(tempSidepanelDir)) rmSync(tempSidepanelDir, { recursive: true, force: true });
    if (existsSync(tempContentDir)) rmSync(tempContentDir, { recursive: true, force: true });

    // Build sidepanel
    await build({
        configFile: false,
        plugins: [(await import('@vitejs/plugin-react')).default()],
        resolve: {
            alias: {
                'events': 'eventemitter3',
            },
        },
        build: {
            outDir: tempSidepanelDir,
            rollupOptions: {
                input: {
                    sidepanel: resolve(process.cwd(), 'src/sidepanel/index.html'),
                },
                output: {
                    entryFileNames: 'sidepanel/index.js',
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

    // Build content
    await build({
        configFile: false,
        plugins: [(await import('@vitejs/plugin-react')).default()],
        resolve: {
            alias: {
                'events': 'eventemitter3',
            },
        },
        build: {
            outDir: tempContentDir,
            rollupOptions: {
                input: {
                    content: resolve(process.cwd(), 'src/content/index.tsx'),
                },
                output: {
                    entryFileNames: 'content/index.js',
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

    // Merge outputs into dist
    mkdirSync(distDir, { recursive: true });
    mkdirSync(join(distDir, 'sidepanel'), { recursive: true });
    mkdirSync(join(distDir, 'content'), { recursive: true });
    mkdirSync(join(distDir, 'assets'), { recursive: true });

    // Copy sidepanel outputs
    const sidepanelJsPath = join(tempSidepanelDir, 'sidepanel/index.js');
    const sidepanelHtmlPath = join(tempSidepanelDir, 'src/sidepanel/index.html');
    if (existsSync(sidepanelJsPath)) {
        copyFileSync(sidepanelJsPath, join(distDir, 'sidepanel/index.js'));
    } else {
        throw new Error(`Sidepanel JS not found: ${sidepanelJsPath}`);
    }
    if (existsSync(sidepanelHtmlPath)) {
        copyFileSync(sidepanelHtmlPath, join(distDir, 'sidepanel/index.html'));
    } else {
        throw new Error(`Sidepanel HTML not found: ${sidepanelHtmlPath}`);
    }

    // Copy content output
    const contentJsPath = join(tempContentDir, 'content/index.js');
    if (existsSync(contentJsPath)) {
        copyFileSync(contentJsPath, join(distDir, 'content/index.js'));
    } else {
        throw new Error(`Content JS not found: ${contentJsPath}`);
    }

    // Copy assets
    const assets = readdirSync(tempSidepanelDir).filter(f => f.startsWith('assets'));
    for (const asset of assets) {
        copyFileSync(
            join(tempSidepanelDir, asset),
            join(distDir, asset)
        );
    }
    const contentAssets = readdirSync(tempContentDir).filter(f => f.startsWith('assets'));
    for (const asset of contentAssets) {
        copyFileSync(
            join(tempContentDir, asset),
            join(distDir, asset)
        );
    }

    // Copy icons folder if it exists
    const iconsSrcDir = resolve(process.cwd(), 'public/icons');
    const iconsDestDir = join(distDir, 'icons');
    if (existsSync(iconsSrcDir)) {
        mkdirSync(iconsDestDir, { recursive: true });
        const iconFiles = readdirSync(iconsSrcDir);
        if (iconFiles.length === 0) {
            console.warn(`No icon files found in ${iconsSrcDir}`);
        } else {
            for (const iconFile of iconFiles) {
                copyFileSync(
                    join(iconsSrcDir, iconFile),
                    join(iconsDestDir, iconFile)
                );
            }
            console.log(`Copied icons to ${iconsDestDir}`);
        }
    }

    // Copy manifest.json
    const manifestPath = resolve(process.cwd(), 'manifest.json');
    if (existsSync(manifestPath)) {
        copyFileSync(manifestPath, join(distDir, 'manifest.json'));
    } else {
        throw new Error(`Manifest not found: ${manifestPath}`);
    }

    // Clean up temp directories
    rmSync(tempSidepanelDir, { recursive: true, force: true });
    rmSync(tempContentDir, { recursive: true, force: true });

    console.log('Build completed successfully');
}

runBuild().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});