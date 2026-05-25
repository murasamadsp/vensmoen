# 🏠 Refugee WikiHub - Architecture Guide

## Overview

This project has been transformed from a simple waste sorting guide into a **modular Refugee WikiHub** platform. The architecture is designed to be **agent-friendly** - meaning other AI agents can easily add content without understanding complex code.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ModuleCard.astro     # Card for module navigation
│   ├── SearchBar.astro      # Search component (ready for implementation)
│   ├── FractionCard.astro   # Existing waste sorting card
│   ├── GuideBody.astro      # Existing guide content
│   └── LanguagePicker.astro # Language selection
│
├── data/
│   ├── modules.ts           # ⭐ MODULE REGISTRY - Add new modules here
│   ├── fractions.ts         # Waste sorting data (legacy)
│   └── modules/             # Module-specific data files
│       └── template.ts      # Template for new module data
│
├── i18n/
│   ├── strings.ts           # Type definitions for translations
│   ├── locales.ts           # Available languages
│   ├── paths.ts             # URL helpers
│   └── <locale>.json        # Translation files (en, nb, uk, ar, es, ti)
│
├── layouts/
│   └── BaseLayout.astro     # Base HTML layout with SEO
│
└── pages/
    ├── index.astro          # Root redirect
    └── [locale]/
        ├── index.astro      # ⭐ WIKIHUB DASHBOARD - Main landing page
        ├── [module]/
        │   └── index.astro  # ⭐ MODULE PAGE - Dynamic module content
        ├── print/
        └── quiz/
```

## 🔧 How to Add a New Module

### Step 1: Register the Module

Edit `src/data/modules.ts`:

```typescript
export const MODULES: ModuleConfig[] = [
  // ... existing modules
  {
    id: 'newmodule',      // Unique ID (used in URLs)
    icon: '📌',           // Emoji icon
    color: '#ff5722',     // Brand color
    enabled: true,        // Show/hide module
  },
];
```

### Step 2: Add Translations

Edit each `src/i18n/<locale>.json` file:

```json
{
  "ui": {
    "moduleNewmodule": "Module Name"
  },
  "newmodule": {
    "articles": {
      "articleSlug": {
        "title": "Article Title",
        "excerpt": "Short description",
        "content": "Full content (optional)"
      }
    },
    "faqs": [
      { "q": "Question?", "a": "Answer" }
    ],
    "resources": [
      { "label": "Resource Name", "url": "https://..." }
    ]
  }
}
```

### Step 3: (Optional) Add Module Data

Create `src/data/modules/newmodule.ts`:

```typescript
import type { ModuleData } from './template';

export const moduleData: ModuleData = {
  moduleId: 'newmodule',
  articles: [
    {
      slug: 'article-slug',
      titleKey: 'newmodule.articles.articleSlug.title',
      excerpt: 'Description',
      priority: 'high',
    },
  ],
};
```

## 🎨 Design System

### Colors
- Uses OKLCH color space for better accessibility
- Each module has a unique brand color
- Automatic dark mode support

### Components
- **ModuleCard**: Hover effects, color-coded borders, RTL support
- **SearchBar**: Ready for client-side search implementation
- **Responsive**: Mobile-first, grid-based layouts

### Accessibility
- WCAG 2.1 AA compliant
- RTL support for Arabic
- Screen reader friendly
- Keyboard navigation

## 🌍 i18n System

### Supported Languages
- `nb` - Norsk (default)
- `en` - English
- `uk` - Українська
- `ar` - العربية (RTL)
- `es` - Español
- `ti` - ትግርኛ

### Adding a Language
1. Create `src/i18n/<code>.json`
2. Add to `src/i18n/locales.ts`
3. Update `strings.ts` type check

## 📱 PWA (Progressive Web App)

To enable offline support:

1. Install `@astrojs/pwa` integration
2. Configure service worker in `astro.config.mjs`
3. Add manifest.json in `public/`

```bash
npm install @astrojs/pwa
```

## 🤖 Agent Guidelines

### For Content Agents

1. **Content goes in i18n JSON files** - No need to touch Astro components
2. **Use the template** - Copy `src/data/modules/template.ts` structure
3. **Follow the schema** - Types are defined in `src/i18n/strings.ts`
4. **Test with one language first** - Then replicate to other locales

### For Code Agents

1. **Don't break existing modules** - Test all routes after changes
2. **Keep components generic** - Use props, not hardcoded content
3. **Maintain type safety** - Update `strings.ts` when adding new keys
4. **Preserve accessibility** - Keep ARIA labels, semantic HTML

## 🔍 Search Implementation

The SearchBar component is ready. To implement actual search:

1. Create a search index at build time
2. Store in `public/search-index.json`
3. Update `SearchBar.astro` script to fetch and filter

## 🚀 Routes Summary

| Route | Description |
|-------|-------------|
| `/[locale]/` | WikiHub dashboard with all modules |
| `/[locale]/fractions/` | Waste sorting (legacy) |
| `/[locale]/health/` | Health information |
| `/[locale]/legal/` | Legal resources |
| `/[locale]/education/` | Education info |
| `/[locale]/camp/` | Camp rules |
| `/[locale]/quiz/` | Interactive quiz |
| `/[locale]/print/` | Printable version |

## 📝 TODO for Next Agent

1. [ ] Implement actual search functionality
2. [ ] Add real content to health/legal/education/camp modules
3. [ ] Create article detail pages (`/[locale]/[module]/[slug]`)
4. [ ] Set up PWA for offline access
5. [ ] Add analytics (privacy-friendly)
6. [ ] Create admin interface for content management

---

**Built with Astro** - Fast, accessible, multilingual static site generator.
