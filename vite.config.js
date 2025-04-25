// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFile, mkdir, rename, rm } from 'fs/promises';
import { existsSync } from 'fs';

// Define output directory
const outDir = resolve(process.cwd(), 'dist');

// Custom Vite plugin to handle post-build tasks
function postBuildPlugin() {
    return {
        name: 'post-build-plugin',
        async writeBundle() {
            console.log('Running post-build tasks...');
            // Copy static files
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
            // Move index.html from dist/src/sidepanel/index.html to dist/index.html
            const srcIndexPath = resolve(outDir, 'src/sidepanel/index.html');
            const destIndexPath = resolve(outDir, 'index.html');
            if (existsSync(srcIndexPath)) {
                await rename(srcIndexPath, destIndexPath);
                console.log('Moved index.html to dist/index.html');
                // Clean up the src/sidepanel directory
                await rm(resolve(outDir, 'src'), { recursive: true });
                console.log('Removed temporary src directory');
            } else {
                console.error('Error: index.html not found at dist/src/sidepanel/index.html');
            }
        }
    };
}

// Build configuration
export default defineConfig({
    plugins: [
        react(),
        postBuildPlugin() // Add the custom plugin
    ],
    resolve: {
        alias: {
            'events': 'events',
        },
    },
    build: {
        outDir,
        emptyOutDir: true, // Clean the output directory before building
        rollupOptions: {
            input: {
                // Side panel content, temporarily output to dist/src/sidepanel/index.html
                sidepanel: resolve(process.cwd(), 'src/sidepanel/index.html'),
            },
            output: {
                entryFileNames: 'sidepanel.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
        base: './', // Use relative paths for the extension
        minify: true,
        chunkSizeWarningLimit: 2000,
    }
});