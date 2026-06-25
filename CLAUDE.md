# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [AGENTS.md](AGENTS.md) for full project documentation (team instructions, CMS schema gotchas, Pages CMS + Claude auto-translate workflow).

## Project Overview

**vensmoen** — multilingual static information site for Vensmoen refugee reception center (Saltdal, Norway). Audience: refugees, immigrants, new Norwegian residents. Sections: About the center, house rules, practical guide, and comprehensive waste-sorting guide with print-friendly A4 sheets.

- **Static output** (Astro 6.4.8, no runtime JS except quiz)
- **Vanilla JS/CSS, no UI frameworks**
- **Manual i18n via `/[locale]/` routing**
- **Content verified against sortere.no waste standards**
- **Edited by non-technical staff via Pages CMS (app.pagescms.org)**

## Core Rules

1. **No invented facts** — only verified info from center admin; use `site.comingSoon` or empty blocks for gaps.
2. **`nb.json` is canonical** — all translation structure and content must match Norwegian first; other languages follow.
3. **No runtime JS without purpose** (quiz is the exception).
4. **Design tokens from `src/styles/tokens.css`; system fonts only.**
5. **Card height consistency across languages** — text length varies; cards reserve fixed line counts (`.emg__label`, `.contact-card__*`).
6. **Code comments in Ukrainian.**
7. **Print layout checked at `/[locale]/waste/print/`** — must fit single A4.

## Development Commands

```bash
npm run dev              # Local dev server
npm run build            # Build static site to dist/
npm run check            # Validate i18n + typecheck + lint (required before push)
npm run validate:i18n    # Check key sync with nb.json
npm run lint:write       # Auto-fix with Biome
npm run check:links      # Verify internal links
npm run translate -- --fill-todo [--dry]   # Fill all [TODO] placeholders from Norwegian
npm run translate -- --source <code> --paths a.b,c [--dry]  # Manual translation (requires ANTHROPIC_API_KEY)
npm run sync:i18n        # Sync key structure across all languages from nb.json
```

## Architecture

### Internationalization

- `src/i18n/locales.ts` — language list (code, label, dir, htmlLang)
- `src/i18n/strings.ts` — typed dictionary loader
- `src/i18n/<code>.json` — translation files; **`nb.json` is source of truth**
- `scripts/validate-i18n.mjs` — enforces key sync with `nb.json`

### Data

- `src/data/fractions.ts` — waste sorting metadata (color, sources, `lastVerified`)
- `src/data/emergency.ts` — national emergency numbers + center duty phone
- `src/data/location.ts` — map links; `src/data/transport.ts` — transit apps

### Pages & Components

- `src/pages/[locale]/index.astro` — home hub (section cards, emergency info)
- `src/pages/[locale]/about/` — center info, contacts, maps, transport
- `src/pages/[locale]/rules/` — house rules
- `src/pages/[locale]/guide/` — practical guide (some content is stubs)
- `src/pages/[locale]/waste/` — sorting guide; `waste/quiz/` — interactive quiz; `waste/print/` — A4 sheet with QR
- `src/components/InfoPage.astro` — shared template for info pages
- `src/components/FractionCard.astro`, `GuideBody.astro` — shared web+print components (DRY)

## i18n Workflow

### Adding a New Language

1. `cp src/i18n/en.json src/i18n/<code>.json` and translate values (keys unchanged)
2. Import in `src/i18n/strings.ts`, add to `dictionaries`
3. Add row to `src/i18n/locales.ts` (`code`, `label`, `dir`, `htmlLang`); use `dir: 'rtl'` for RTL scripts
4. `npm run check && npm run build` — validator catches missing keys, routes auto-generated
5. Add language record in `.pages.yml` (`content:` section) with `fields: *fields` and `format: json`

### Updating Waste Content

After verifying fraction at sortere.no:
1. Update text in `src/i18n/*.json` (`fractions`)
2. Update `lastVerified` date in `src/data/fractions.ts`

### ⚠️ CRITICAL: `.pages.yml` Schema Must Cover ALL Keys

Pages CMS **deletes any JSON keys missing from the schema** on save. Therefore:

- **Every new key in `nb.json` must be added to `.pages.yml`** (in the shared YAML anchor `&fields`)
- `validate-i18n` catches this (deploy fails red, prod doesn't update — protection works), but prevention is better
- Verify completeness: compare all leaf paths in `nb.json` against field paths in `.pages.yml` — zero mismatches allowed
- System strings (`ui`) are hidden in CMS via `hidden: true` (remain in files, editor can't see them)

### Auto-Translate (GitHub Actions)

Embedded in `.github/workflows/deploy.yml`, runs `scripts/auto-translate.mjs` on every CMS save:

- **Smart source detection** — changed language becomes source; translates changed fields to other 5 languages
- **No infinite loop** — bot commits as `vensmoen-translate-bot`, such pushes don't trigger new workflow
- **No eternal desync** — diff base is last **successful** bot commit, not prior push
- **Best-effort** — no credits/API error → step skipped, site still builds & deploys (prod doesn't break)
- **No wasted calls** — if `src/i18n` unchanged → Claude doesn't run
- **Reliable output** — structured outputs guarantee valid JSON; style guide doesn't translate proper names (Vensmoen, Saltdal, Røkland, UDI, NAV, Mental Helse, sortere.no) and preserves `\n`, `•`, phones, email

### Content Source of Truth (Nuance)

Structurally: `nb.json` is canonical (`validate-i18n`, `--fill-todo` reads `[TODO] <nb>`). By **content**: auto-translate uses the language edited in CMS as source for changed fields (usually the editor's working language). Structure follows `nb`, fresh content follows the edited language.

## Testing & Deployment

- Push to `main` = deploy to GitHub Pages
- Fork origin points to `github.com/murasamadsp/vensmoen`
- Manual translation runs: use `--dry` first, review `git diff`, then restore with `git restore src/i18n/` if needed
