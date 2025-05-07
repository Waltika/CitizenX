// vite.config.extension.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFile, mkdir, rename, rm } from 'fs/promises';
import { existsSync } from 'fs';

const outDir = resolve(process.cwd(), 'dist');

function postBuildPlugin() {
    return {
        name: 'post-build-plugin',
        async writeBundle() {
            console.log('Running post-build tasks...');
            console.log('Copying static files...');
            await mkdir(resolve(outDir, 'icons'), { recursive: true });
            try {
                await copyFile(resolve(process.cwd(), 'icons/icon16.png'), resolve(outDir, 'icons/icon16.png'));
                console.log('Copied icon16.png');
            } catch (error) {
                console.error('Failed to copy icon16.png:', error);
            }
            try {
                await copyFile(resolve(process.cwd(), 'icons/icon32.png'), resolve(outDir, 'icons/icon32.png'));
                console.log('Copied icon32.png');
            } catch (error) {
                console.error('Failed to copy icon32.png:', error);
            }
            try {
                await copyFile(resolve(process.cwd(), 'icons/icon128.png'), resolve(outDir, 'icons/icon128.png'));
                console.log('Copied icon128.png');
            } catch (error) {
                console.error('Failed to copy icon128.png:', error);
            }
            try {
                await copyFile(resolve(process.cwd(), 'manifest.json'), resolve(outDir, 'manifest.json'));
                console.log('Copied manifest.json');
            } catch (error) {
                console.error('Failed to copy manifest.json:', error);
            }
            const srcIndexPath = resolve(outDir, 'src/sidepanel/index.html');
            const destIndexPath = resolve(outDir, 'index.html');
            if (existsSync(srcIndexPath)) {
                await rename(srcIndexPath, destIndexPath);
                console.log('Moved index.html to dist/index.html');
                await rm(resolve(outDir, 'src'), { recursive: true });
                console.log('Removed temporary src directory');
            } else {
                console.error('Error: index.html not found at dist/src/sidepanel/index.html');
            }
        }
    };
}

export default defineConfig({
    plugins: [
        react(),
        postBuildPlugin()
    ],
    resolve: {
        alias: {
            'events': 'events',
        },
    },
    css: {
        modules: {
            localsConvention: 'camelCase',
            scopeBehaviour: 'local'
        },
        preprocessorOptions: {
            scss: {
                additionalData: '@use "sass:math";'
            }
        }
    },
    build: {
        outDir,
        emptyOutDir: true,
        rollupOptions: {
            input: {
                sidepanel: resolve(process.cwd(), 'src/sidepanel/index.html'),
                background: resolve(process.cwd(), 'src/background.ts'),
                highlightAnnotation: resolve(process.cwd(), 'src/contentScripts/highlightAnnotation.ts'),
                injectPresence: resolve(process.cwd(), 'src/contentScripts/injectPresence.ts'),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'background') {
                        return 'background.js';
                    }
                    if (chunkInfo.name === 'highlightAnnotation') {
                        return 'contentScripts/highlightAnnotation.js';
                    }
                    if (chunkInfo.name === 'injectPresence') {
                        return 'contentScripts/injectPresence.js';
                    }
                    return 'sidepanel.js';
                },
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
        base: './',
        minify: true,
        chunkSizeWarningLimit: 2000,
    }
});