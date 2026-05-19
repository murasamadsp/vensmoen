# Kildesortering — flerspråklig avfallsguide

En enkel, vakker og utskriftsvennlig nettside som forklarer flyktninger og
nye innbyggere hvordan de skal sortere avfallet sitt hjemme.
Bygget som statisk side for **GitHub Pages**.

🌍 Språk: Norsk · English · Українська · العربية · Español · ትግርኛ
🖨️ Egen utskriftsrute per språk (A4, QR tilbake til nettsiden)
✅ Innhold verifisert mot den nasjonale standarden **sortere.no**

## Teknologi

- [Astro](https://astro.build) — statisk output, null runtime-JS
- Ingen UI-rammeverk, ingen nettfonter (systemfonter for alle skript)
- QR-kode genereres ved bygg (`qrcode`), ingen ekstern tjeneste

## Utvikling

```bash
npm install
npm run dev      # lokal utviklingsserver
npm run build    # bygger til dist/
npm run preview  # forhåndsvis bygget
npm run check    # i18n-validering + typesjekk
```

## Struktur

```
src/
  data/fractions.ts        Språkuavhengige metadata (farge, kilde, dato)
  i18n/locales.ts          Liste over språk (kode, navn, dir)
  i18n/<kode>.json          All oversettbar tekst for ett språk
  i18n/strings.ts           Typet loader for JSON-ordbøkene
  layouts/BaseLayout.astro  <html lang/dir>, head, hreflang/canonical
  components/               FractionCard (delt web+print), LanguagePicker
  pages/index.astro         Omdirigerer til nettleserens språk
  pages/[locale]/index.astro        Hovedguiden
  pages/[locale]/quiz/index.astro   Interaktiv quiz
  pages/[locale]/print/index.astro  Utskriftsark + QR
  styles/                   tokens.css, global.css, print.css
scripts/validate-i18n.mjs   Sjekker at alle språk er synkronisert mot nb
```

Samme `FractionCard`/`GuideBody` brukes på nettsiden og på utskriftsarket –
innholdet finnes bare ett sted (DRY). `print.css` komprimerer kun layouten
til A4.

## Legge til et nytt språk

1. Kopier `src/i18n/en.json` til `src/i18n/<kode>.json` og oversett alle
   verdier (ikke nøklene).
2. Importer fila i `src/i18n/strings.ts` og legg den til i `dictionaries`.
3. Legg til én linje i `src/i18n/locales.ts` (`code`, `label`, `dir`,
   `htmlLang`). Bruk `dir: 'rtl'` for høyre-mot-venstre-skript.
4. `npm run check && npm run build` — validatoren fanger manglende nøkler;
   nye ruter `/<kode>/`, `/<kode>/quiz/` og `/<kode>/print/` lages automatisk.

## Oppdatere og verifisere innhold

- Faktatekst per fraksjon ligger i `src/i18n/*.json` under `fractions`.
- `lastVerified`-dato ligger i `src/data/fractions.ts`.
- Norsk (`nb.json`) er fasit — oversett andre språk fra den.

Hver fraksjon har `bin` (hvilken dunk/pose), `accepted`, `rejected` og
`note`. Når du har sjekket en fraksjon mot den nasjonale standarden
[sortere.no](https://sortere.no/): oppdater teksten **og** sett ny
`VERIFIED`-dato i `src/data/fractions.ts`.

Guiden dekker bevisst kun det innbyggeren trenger hjemme. Praktisk logistikk
(miljøtorg, henteplan) er holdt utenfor for å gjøre den enkel å forstå.

## Publisering (GitHub Pages)

`.github/workflows/deploy.yml` bygger og deployer automatisk ved push til
`main`. Sett **Settings → Pages → Source: GitHub Actions** én gang.

## Kilder

- Nasjonal standard for kildesortering: <https://sortere.no/>
