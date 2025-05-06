// vite.config.web.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const outDir = resolve(process.cwd(), 'dist/web');

export default defineConfig({
    plugins: [
        react()
    ],
    resolve: {
        alias: {
            'events': 'events',
        },
    },
    build: {
        outDir,
        emptyOutDir: true,
        rollupOptions: {
            input: {
                viewAnnotations: resolve(process.cwd(), 'src/web/view-annotations.js'),
            },
            output: {
                format: 'es', // ES format to allow code-splitting
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'viewAnnotations') {
                        return 'assets/annotation-ui.bundle.js';
                    }
                    return '[name].js';
                },
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
        base: '/',
        minify: true,
        chunkSizeWarningLimit: 2000,
    }
});