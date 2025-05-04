import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    root: resolve(__dirname), // Set root to /website
    build: {
        outDir: resolve(__dirname, 'static'), // Output to /website/static
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'src/client.tsx'), // Entry point
            output: {
                entryFileNames: 'client.js', // Output as client.js
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: resolve(__dirname, '../shared/src/components/AnnotationList.css'),
                    dest: 'assets',
                },
            ],
        }),
    ],
    resolve: {
        alias: {
            '@citizenx/shared': resolve(__dirname, '../shared/dist'),
        },
    },
});