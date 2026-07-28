# Architecture

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| UI | React 18 |
| Language | JavaScript (app), Node.js |
| Package manager | npm |
| Hosting | Vercel (проект связан с Vercel) |
| Browser automation (CCN live) | Stagehand + Playwright; Browserbase keys предусмотрены в env |
| Validation helpers | zod (зависимость проекта) |

---

## Directory Roles

| Path | Role |
| --- | --- |
| `app/` | App Router: страница UI, layout, API routes. |
| `app/api/` | HTTP API (анализ изображения, registry, `/api/osa/*`, generate и др.). |
| `app/components/` | UI-компоненты workspace / analysis. |
| `app/lib/` | Доменная логика: pipeline, CVO adapter, CCN, memory, spec, registry, visual search и др. |
| `app/lib/pipeline/` | Оркестрация OSA AI Office (`osaPipeline`, CVO, gates). |
| `app/lib/ccn/` | Chief Catalog Navigator (mock + live). |
| `app/lib/memory/` | Visual Memory и Experience Memory. |
| `app/lib/spec/` | Spec Assembler, Estimate Line, Designer Summary. |
| `tests/osa/` | Фикстуры и регрессии Core / pipeline / memory / vision / spec. |
| `scripts/` | Операционные и проверочные скрипты. |
| `data/` | Runtime-хранилище visual memory (не источник продуктовых законов). |
| `public/` | Статика (например `logo.png`). |

---

## Feature Module Convention

Текущий репозиторий не использует отдельную папку `features/`.  
Доменные модули живут в `app/lib/<domain>/`, API — в `app/api/`, UI — в `app/page.js` и `app/components/`.

Новые доменные возможности OSA AI Office добавляются как библиотечные модули + тонкий API route, без параллельной философии продукта.

---

## Documentation Layers

- `.foundation/` — законы продукта и базовый архитектурный снимок (этот контур).
- `README.md` — краткий запуск локально.
- Прочие рабочие артефакты (canvas, тендеры, планы) не заменяют `.foundation/`.

---

## Deployment Target

Локально: `npm run dev` (порт 3000).  
Сборка: `npm run build`.  
Продакшен-хостинг: Vercel (по текущей связке проекта).

Ключевые env-флаги CCN (из `.env.example`): `OSA_CCN_LIVE`, `OSA_CCN_BROWSER_ENV`, `OSA_CCN_HEADLESS`, ключи Browserbase.

---

## Current Status

Принятая **целевая** decision path продукта (AI Office):

User request → `/api/osa/pipeline` → CVO → Visual Memory → Experience Memory → Registry → CCN → Spec Assembler → Estimate Line → Designer Summary → User.

Фактическое состояние репозитория на момент синхронизации документации:

- AI Office Core реализован как API-path (`/api/osa/*`).
- Shipping UI продолжает использовать отдельный путь анализа / discovery / basket estimate.
- UI к каноническому `/api/osa/pipeline` как единственному decision path ещё не приведён.

Этот раздел фиксирует факт dual-path, а не предлагает новую архитектуру.

Специалисты AI Office в текущих границах: CVO, CCN, Spec Assembler. CDIO / BIM не входят в текущие границы OSA.

---

Статус: заполнен фактами текущего репозитория. Детали миграции UI → Office — вне этого документа (рабочие планы / transition map не являются частью `.foundation`).
