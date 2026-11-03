import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The site's public address, used in the link-preview tags in index.html
  // (__SITE_URL__). Defaults to the live site; set VITE_SITE_URL to change it,
  // e.g. `vite build --mode beta` reads .env.beta for beta.cinematd.com.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL || 'https://cinematd.com').replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      {
        name: 'cinematd-site-url',
        transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    ],

    define: {
      'process.env': process.env
    }
  }
})
