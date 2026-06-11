# Vensmoen mottak — flerspråklig informasjonsside

Statisk informasjonsside for beboere på Vensmoen mottak (Saltdal):
om mottaket, husregler, en praktisk guide til livet i Norge — og en
komplett kildesorteringsguide. Kun fast informasjon som ikke foreldes.
Bygget som statisk side for **GitHub Pages**.

🌍 Språk: Norsk · English · Українська · العربية · Español · ትግርኛ
🖨️ Sorteringsguiden har egen utskriftsrute per språk (A4, QR til nettsiden)
✅ Sorteringsinnhold verifisert mot den nasjonale standarden **sortere.no**

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
  data/emergency.ts        Nasjonale nødnumre (permanente fakta)
  i18n/locales.ts          Liste over språk (kode, navn, dir)
  i18n/<kode>.json          All oversettbar tekst for ett språk
  i18n/strings.ts           Typet loader for JSON-ordbøkene
  i18n/paths.ts             URL-byggere (respekterer Astro base)
  layouts/BaseLayout.astro  <html lang/dir>, head, hreflang/canonical
  components/               GuideBody/FractionCard (delt web+print),
                            InfoPage (om/regler/guide), SectionIcon,
                            LanguagePicker
  pages/index.astro         Omdirigerer til nettleserens språk
  pages/[locale]/index.astro        Forsiden: hub med seksjonskort + nødnumre
  pages/[locale]/om/                Om mottaket og kontakt
  pages/[locale]/regler/            Husregler
  pages/[locale]/guide/             Praktisk guide til livet i Norge
  pages/[locale]/avfall/            Kildesorteringsguiden
  pages/[locale]/avfall/quiz/       Interaktiv quiz
  pages/[locale]/avfall/print/      Utskriftsark + QR
  styles/                   tokens.css, global.css, print.css
scripts/validate-i18n.mjs   Sjekker at alle språk er synkronisert mot nb
```

Innholdet på infosidene (`om`/`regler`/`guide`) ligger i `pages`-delen av
hver språkfil. En blokk uten `body` rendres som en tydelig «mer informasjon
kommer»-plassholder — skriv inn `body` når faktainnholdet er klart, og
validatoren krever det da i alle språk.

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
   alle ruter under `/<kode>/` lages automatisk.

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
