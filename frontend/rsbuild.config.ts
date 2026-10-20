import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';
const target = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8080';
export default defineConfig({
  plugins: [pluginReact()],
  html: { template: './index.html' },
  source: { entry: { index: './src/main.tsx' } },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  output: { distPath: { root: 'dist' } },
  server: { port: 3000, proxy: { '/api': { target, changeOrigin: false } } },
});
