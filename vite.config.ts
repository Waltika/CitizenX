import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                sidepanel: path.resolve(__dirname, 'public/sidepanel/index.html'),
                content: path.resolve(__dirname, 'src/content/index.tsx'),
                background: path.resolve(__dirname, 'src/background/index.ts')
            },
            output: {
                format: 'es', // Ensure ES module output
                entryFileNames: (chunkInfo) => {
                    return chunkInfo.name === 'sidepanel' || chunkInfo.name === 'background' ? '[name]/index.js' : '[name]/index.js';
                },
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    },
    publicDir: 'public',
    css: {
        modules: {
            localsConvention: 'camelCase',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
    }
});