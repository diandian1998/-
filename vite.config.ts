import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'

// 基于时间戳生成唯一文件名后缀
const timestamp = Date.now()
const chunkFileNames = `assets/[name]-${timestamp}-[hash].js`
const entryFileNames = `assets/[name]-${timestamp}-[hash].js`

export default defineConfig({
  base: './',
  plugins: [
    react(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
      output: {
        entryFileNames,
        chunkFileNames,
        assetFileNames: `assets/[name]-${timestamp}-[hash][extname]`,
      },
    },
  },
})
