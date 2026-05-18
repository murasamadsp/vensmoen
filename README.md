# Kildesortering i Saltdal — flerspråklig avfallsguide

En enkel, vakker og utskriftsvennlig nettside som forklarer flyktninger og
nye innbyggere i **Saltdal kommune** hvordan de skal sortere avfallet sitt.
Bygget som statisk side for **GitHub Pages**.

🌍 Språk: Norsk · English · Українська · العربية · Español
🖨️ Egen utskriftsrute per språk (A4, QR tilbake til nettsiden)
✅ Innhold verifisert mot **Iris Salten** (operatør i Saltdal) og den
nasjonale standarden **sortere.no**

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
```

## Struktur

```
src/
  data/fractions.ts        Språkuavhengige metadata (farge, kilde, dato)
  i18n/locales.ts          Liste over språk (kode, navn, dir)
  i18n/<kode>.json          All oversettbar tekst for ett språk
  i18n/strings.ts           Typet loader for JSON-ordbøkene
  layouts/BaseLayout.astro  <html lang/dir>, head
  components/               FractionCard (delt web+print), LanguagePicker
  pages/index.astro         Omdirigerer til /nb/
  pages/[locale]/index.astro        Hovedguiden
  pages/[locale]/print/index.astro  Utskriftsark + QR
  styles/                   tokens.css, global.css, print.css
```

Samme `FractionCard` brukes på nettsiden og på utskriftsarket – innholdet
finnes bare ett sted (DRY). `print.css` komprimerer kun layouten til A4.

## Legge til et nytt språk

Arkitekturen er laget for dette (f.eks. tigrinja/amharisk senere):

1. Kopier `src/i18n/en.json` til `src/i18n/<kode>.json` og oversett alle
   verdier (ikke nøklene).
2. Importer fila i `src/i18n/strings.ts` og legg den til i `dictionaries`.
3. Legg til én linje i `src/i18n/locales.ts` (`code`, `label`, `dir`,
   `htmlLang`). Bruk `dir: 'rtl'` for høyre-mot-venstre-skript.
4. `npm run build` — ny rute `/<kode>/` og `/<kode>/print/` lages automatisk.

## Oppdatere og verifisere innhold

Innholdet skal alltid samsvare med kilden:

- Faktatekst per fraksjon ligger i `src/i18n/*.json` under `fractions`.
- Kilde-URL og `lastVerified`-dato ligger i `src/data/fractions.ts`.
- Norsk (`nb.json`) er fasit — oversett andre språk fra den.

Hver fraksjon har feltet `bin` (hvilken dunk/pose – det viktigste for en
nybegynner), `accepted`, `rejected` og `note`. Når du har sjekket en fraksjon
mot [Iris Salten sin sorteringsguide](https://www.iris-salten.no/privat/sorteringsguide/):
oppdater teksten **og** sett ny `VERIFIED`-dato i `src/data/fractions.ts`.

Guiden dekker bevisst kun det innbyggeren trenger hjemme (dunkene/posene rett
ved boligen). Praktisk logistikk (miljøtorg, henteplan) er holdt utenfor for å
gjøre den enkel å forstå for alle.

## Publisering (GitHub Pages)

`.github/workflows/deploy.yml` bygger og deployer automatisk ved push til
`main`. Aktiver **Settings → Pages → Source: GitHub Actions** én gang.

Live: `https://murasamadsp.github.io/avfallssortering/`

## Kilder

- Iris Salten — sorteringsguide: <https://www.iris-salten.no/privat/sorteringsguide/>
- Nasjonal standard: <https://sortere.no/>
- Renovasjonsforskrift Salten (Lovdata): <https://lovdata.no/dokument/LF/forskrift/2018-06-19-2335>
- Saltdal kommune: <https://www.saltdal.kommune.no/>
