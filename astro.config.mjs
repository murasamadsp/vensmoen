import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages: https://murasamadsp.github.io/avfallssortering/
// i18n-ruting håndteres manuelt via [locale]-segment + src/i18n/locales.ts,
// slik at et nytt språk = én JSON-fil + én linje i locales.ts.
export default defineConfig({
  site: 'https://murasamadsp.github.io',
  base: '/avfallssortering',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
  compressHTML: true,
  integrations: [
    sitemap({
      // /print/ er noindex-duplikat av guiden – hold den ute av sitemap.
      filter: (page) => !page.includes('/print/'),
    }),
  ],
});
