# CMS / контент — открытый трек

Легенда важности: 🔴 важно · 🟡 средне · ⚪ мелочь/полиш.

## 🔴 Авто-перевод: внешняя настройка

- [ ] 🔴 Добавить API key выбранного провайдера в GitHub Secrets:
  `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` или `GOOGLE_TRANSLATE_API_KEY`.
- [ ] 🔴 Выставить GitHub Variables:
  `TRANSLATE_PROVIDER`, `TRANSLATE_MODEL`.
- [ ] 🟡 При желании выставить fallback:
  `TRANSLATE_FALLBACK_PROVIDER`, `TRANSLATE_FALLBACK_MODEL`.
- [ ] 🔴 Запустить `Translation health check` в GitHub Actions и убедиться,
  что выбранные provider/model живы.
- [ ] 🔴 Сделать тестовую правку в Pages CMS и проверить полный цикл:
  CMS save → deploy workflow → auto-translate commit → build/deploy.

## 🔴 Контент

- [ ] 🔴 Написать тексты для пустых тем Practical guide. Сейчас в `nb` заполнен
  только `Skole`; остальные темы без `body`.

## ⚪ Полиш

- [ ] ⚪ Решить, считать ли `docs/editor-guide.md` + PDF достаточной памяткой
  для бухгалтера или нужна отдельная короткая one-page версия.
