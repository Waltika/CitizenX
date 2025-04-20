import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    root: './',
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'src/background/index.tsx'),
                content: resolve(__dirname, 'src/content/index.tsx'),
                popup: resolve(__dirname, 'src/popup/index.html')
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    }
});