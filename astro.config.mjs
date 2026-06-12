import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// GitHub Pages: https://murasamadsp.github.io/vensmoen/
// i18n-ruting håndteres manuelt via [locale]-segment + src/i18n/locales.ts,
// slik at et nytt språk = én JSON-fil + én linje i locales.ts.
export default defineConfig({
  site: 'https://murasamadsp.github.io',
  base: '/vensmoen',
  trailingSlash: 'always',
  output: 'static',
  // inlineStylesheets: увесь CSS ~4 КБ — інлайн прибирає єдиний
  // render-blocking запит (на GitHub Pages RTT дорожчий за байти).
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [
    sitemap({
      // У sitemap лише індексовані сторінки: /print/ — noindex-дублікат гіда,
      // корінь /vensmoen/ — noindex-редірект на мовну версію.
      filter: (page) =>
        !page.includes('/print/') &&
        page !== 'https://murasamadsp.github.io/vensmoen/',
    }),
  ],
});
