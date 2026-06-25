# Vensmoen mottak — багатомовний інформаційний сайт

Статичний інформаційний сайт для мешканців центру прийому Vensmoen
(Салтдал): про центр, правила проживання, практичний гід життям у Норвегії
та повний гід із сортування відходів. Лише постійна інформація, що не
застаріває. Збирається як статичний сайт для **GitHub Pages**.

🌍 Мови: Norsk · English · Українська · العربية · Español · ትግርኛ
🖨️ Гід із сортування має окрему сторінку друку для кожної мови (A4, QR на сайт)
✅ Контент сортування звірено з національним стандартом **sortere.no**

## Технології

- [Astro](https://astro.build) — статичний вивід, нуль runtime-JS
- Без UI-фреймворків і вебшрифтів (системні шрифти для всіх скриптів)
- QR-код генерується під час збірки (`qrcode`), без зовнішніх сервісів

## Розробка

```bash
npm install
npm run dev      # локальний сервер розробки
npm run build    # збірка в dist/
npm run preview  # перегляд збірки
npm run check    # валідація i18n + перевірка типів + лінтинг
```

## Структура

```plaintext
src/
  data/fractions.ts        Мовонезалежні метадані фракцій (колір, джерело, дата)
  data/emergency.ts        Національні екстрені номери + черговий телефон центру
  data/location.ts         Посилання на карти (Google/Apple Maps)
  data/transport.ts        Застосунки з розкладом транспорту
  i18n/locales.ts          Список мов (код, назва, dir)
  i18n/<код>.json           Усі перекладні тексти однієї мови
  i18n/strings.ts           Типізований лоадер JSON-словників
  i18n/paths.ts             Будівники URL (з урахуванням Astro base)
  layouts/BaseLayout.astro  <html lang/dir>, head, hreflang/canonical
  components/               GuideBody/FractionCard (спільні веб+друк),
                            InfoPage (about/rules/guide), SectionIcon,
                            LanguagePicker
  pages/index.astro         Перенаправлення на мову браузера
  pages/[locale]/index.astro        Головна: хаб із картками + екстрені номери
  pages/[locale]/about/                Про центр, контакти, карти, транспорт
  pages/[locale]/rules/            Правила проживання
  pages/[locale]/guide/             Практичний гід життям у Норвегії
  pages/[locale]/waste/            Гід із сортування відходів
  pages/[locale]/waste/quiz/       Інтерактивний квіз
  pages/[locale]/waste/print/      Аркуш для друку + QR
  styles/                   tokens.css, global.css, print.css
scripts/validate-i18n.mjs   Перевіряє синхронність усіх мов із nb
```

Контент інфосторінок (`about`/`rules`/`guide`) лежить у секції `pages` кожного
мовного файлу. Блок без `body` рендериться як чесна плашка «інформація
з'явиться згодом» — впишіть `body`, коли фактичний текст буде готовий, і
валідатор вимагатиме його в усіх мовах.

Той самий `FractionCard`/`GuideBody` використовується на сайті й на аркуші
друку — контент існує лише в одному місці (DRY). `print.css` лише стискає
макет до A4.

## Як додати нову мову

1. Скопіюйте `src/i18n/en.json` у `src/i18n/<код>.json` і перекладіть усі
   значення (ключі не чіпати).
2. Імпортуйте файл у `src/i18n/strings.ts` і додайте в `dictionaries`.
3. Додайте один рядок у `src/i18n/locales.ts` (`code`, `label`, `dir`,
   `htmlLang`). Для скриптів справа наліво — `dir: 'rtl'`.
4. `npm run check && npm run build` — валідатор зловить пропущені ключі;
   всі маршрути під `/<код>/` створяться автоматично.

## Оновлення та перевірка контенту

- Фактичні тексти фракцій — у `src/i18n/*.json` під ключем `fractions`.
- Дата `lastVerified` — у `src/data/fractions.ts`.
- Норвезька (`nb.json`) — еталон; інші мови перекладаються з неї.

Кожна фракція має `bin` (який бак/пакет), `accepted`, `rejected` та `note`.
Після звірки фракції з національним стандартом
[sortere.no](https://sortere.no/) оновіть текст **і** поставте нову дату
`VERIFIED` у `src/data/fractions.ts`.

Гід свідомо охоплює лише те, що мешканцю потрібно вдома. Практична
логістика (miljøtorg, графік вивозу) винесена за дужки заради простоти.

## Публікація (GitHub Pages)

`.github/workflows/deploy.yml` автоматично збирає та деплоїть при push у
`main`. Один раз увімкніть **Settings → Pages → Source: GitHub Actions**.

## Джерела

- Національний стандарт сортування: <https://sortere.no/>
