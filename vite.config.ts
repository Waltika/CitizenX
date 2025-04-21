import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, readdirSync } from 'fs';

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'copy-manifest',
            writeBundle() {
                const possiblePaths = [
                    resolve(__dirname, 'manifest.json'),
                    resolve(__dirname, 'public/manifest.json'),
                    resolve(__dirname, 'src/manifest.json'),
                ];
                let manifestPath: string | null = null;

                for (const path of possiblePaths) {
                    if (existsSync(path)) {
                        manifestPath = path;
                        break;
                    }
                }

                if (manifestPath) {
                    const destPath = resolve(__dirname, 'dist/manifest.json');
                    copyFileSync(manifestPath, destPath);
                    console.log(`Copied manifest.json from ${manifestPath} to dist`);
                } else {
                    console.error('manifest.json not found in root, public/, or src/');
                    throw new Error('manifest.json is missing');
                }
            },
        },
        {
            name: 'debug-files',
            config() {
                const srcDir = resolve(__dirname, 'src');
                console.log('Files in src:', readdirSync(srcDir, { recursive: true }));
            },
            writeBundle() {
                const distDir = resolve(__dirname, 'dist');
                console.log('Files in dist:', readdirSync(distDir, { recursive: true }));
            },
        },
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
                background: resolve(__dirname, 'src/background/index.ts'),
                content: resolve(__dirname, 'src/content/index.tsx'), // Ensure content script is included
            },
            output: {
                entryFileNames: '[name]/index.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
});