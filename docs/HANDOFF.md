# Smart Transit: davam etmək üçün kontekst (Cursor / istənilən agent)

> Əvvəlcə bu faylı, sonra `CLAUDE.md`, `docs/PROGRESS.md` və `docs/ADR.md`-ni oxu.
> Birbaşa icra et. Dərin araşdırma etmə, böyük faylları (xüsusən `data/seed/*`) tam oxuma.

## 1. Layihə

**Bakı avtobus şəbəkəsi üçün iki modullu platforma.**

- **Sərnişin:**
  - dayanacaq üzrə ETA;
  - avtobusların xəritədə real vaxt yeri;
  - avtobusun sıxlığını bildirmək (Boş / Orta / Sıx / Dolu).
- **Operator:**
  - bildirişlərdən qurulan sıxlıq xəritəsi;
  - bir xətt üzrə 10 dəqiqədə çoxlu yüksək sıxlıq olanda "ehtiyat avtobus ayır" tövsiyəsi;
  - "Qəbul et" basılanda ehtiyat avtobus xəritədə görünür.

**Qiymətləndirmədə əsas olanlar:**
- arxitektura;
- clean code;
- unit testlər;
- real PostgreSQL;
- Swagger;
- Docker.

**Data mənşəyi:**
- **Real:** AYNA ictimai xəritəsi (map.ayna.gov.az) və opendata.az (BakuBus gündəlik gedişləri).
- **Simulyasiya:** avtobus yerləri, ETA və baza sıxlığı.

**Qadağalar:**
- Repo-da, kodda və sənədlərdə "hakaton/hackathon", "transporttech", "AYNA Keçid", "əvvəlki layihə" ifadələri **olmamalıdır**.
- `.env`-in məzmunu heç bir çıxışda çap olunmamalıdır.

## 2. Mühit

- Başqasının **Windows** kompüteridir, Docker və admin hüququ yoxdur.
- **Node 26, npm 11.** Skriptlər cross-platform olmalıdır: `tsx`, `cross-env`, `rimraf`; bash yoxdur.
- **DB:** Neon PostgreSQL. Repo kökündəki `.env`-də iki dəyişən var:
  - `DATABASE_URL` (əsas baza);
  - `DATABASE_URL_TEST` (test bazası).
- `apps/api/prisma.config.ts` root `.env`-i yükləyir. `PRISMA_TARGET=test` skriptləri test bazasına yönləndirir.
- **Versiyalar:** NestJS 11.2.8, TypeScript 5.9.3, Prisma 6.19.3, ESLint 9. Bəzi paketlərin v12-si yalnız ESM-dir: event-emitter 3.0.1, jwt 11.0.2, passport 11.0.5 (ADR-002). **Versiyaları yüksəltmə.**
- **Repo:** `github.com/KamranPirishzade/Smart-Transit-Team-11`, branch `main`. Hər hissədən sonra commit et və push et.

## 3. Hazır olanlar (M1–M3, son commit `f2bbcbb`)

**M1:**
- npm workspaces monorepo:
  - `apps/api` (NestJS);
  - `apps/web` (Next.js skeleti);
  - `packages/*`.
- Prisma sxemi, miqrasiya, idempotent seed.
- Seed nəticəsi: 208 marşrut, 402 istiqamət, 3 450 dayanacaq, 11 779 route_stops.
- AYNA datasındakı defektlər ADR-006-da sənədləşib.

**M2:**
- network endpoint-ləri;
- `ScheduleSimulator` (mövqe zamanın saf funksiyasıdır), `EtaCalculator`;
- `/vehicles`, `/stops/:id/arrivals`, SSE `/stream/vehicles`;
- `SimClock`;
- modul sərhədləri: yalnız `public-api.ts` vasitəsilə, ESLint yoxlayır.

**M3:**
- `POST /reports` (rate limit: bir `deviceId` üçün dəqiqədə 3);
- `CrowdAggregator` (10 dəq pəncərə, yarımömür 5 dəq);
- `CongestionRule` (≥ 8 yüksək bildiriş, ≥ 60% pay, açıq PENDING yoxdur) + partial unique index;
- accept/dismiss → `reserve-{id}` avtobusu;
- JWT login, `/operator/*`, `/stream/operator` (SSE, `?token=`);
- `npm run demo:surge`.

**Keyfiyyət:**
- 163 unit test;
- domen coverage: statements 99%, branches 90%;
- typecheck, lint və build 0 xəta.

**Arxitektura qaydaları:**
- Hər modul `domain / application (use case + port) / infrastructure (Prisma) / presentation (controller, DTO)` qatlarından ibarətdir.
- `domain` NestJS və Prisma import etmir.
- Modullar arası yazma əməliyyatları hadisələrlə gedir (`@nestjs/event-emitter`), oxumalar portlarla.
- Xəta formatı vahiddir: `{ statusCode, error, message, path, timestamp }`.

### API (`http://localhost:4000/api`, Swagger: `/api/docs`, JSON: `/api/docs-json`)

| Metod | Yol | Qeyd |
| --- | --- | --- |
| GET | `/routes?query=` | dayanacağı olmayan 7 marşrut `hasStops: false` ilə sonda |
| GET | `/routes/:id` | istiqamətlər, dayanacaqlar, xətt |
| GET | `/stops/nearby?lat&lon&radius` | |
| GET | `/stops/:id`, `/stops/:id/arrivals?limit=` | limit ≤ 50 |
| GET | `/vehicles?routeId=` və ya `?bbox=` | ən çox 800, `truncated` |
| SSE | `/stream/vehicles?routeId=|bbox=` | hər 2 s |
| POST | `/reports` | `routeId, direction?, vehicleId?, stopId?, level, lat, lon, deviceId` |
| GET | `/crowding/heatmap`, `/crowding/routes` | |
| POST | `/auth/login` | `{email, password}` → `{accessToken}` |
| GET 🔒 | `/operator/overview`, `/operator/recommendations?status=` | |
| POST 🔒 | `/operator/recommendations/:id/accept` və `/dismiss` | ikinci accept → 409 |
| PUT 🔒 | `/operator/sim-clock` | `{time:"08:15"}` və ya `{reset:true}` |
| SSE 🔒 | `/stream/operator?token=` | |
| GET | `/health` | `{status, db, uptimeS}` |

Dəqiq sxem üçün Swagger JSON-a bax. Mövcud backend-i dəyişmə, yalnız lazım olsa kiçik düzəliş et.

## 4. Qalan işlər (sıra ilə)

**Limit və ya vaxt çatmasa sıra: 0 → M4 → M6 → M5.** Docker kəsilmir.

### 0. Kiçik düzəlişlər
1. `demo:surge --route` avtobus **nömrəsini** qəbul etsin (49 → route id 37). İndi id qəbul edir: `--route 49` 64 nömrəli avtobusu seçdi. `--route-id` ayrıca seçim kimi qalsın.
2. `npm run db:reset-ops`: `crowd_reports`, `recommendations`, `reserve_dispatches` cədvəllərini təmizləsin. Əsas bazada canlı yoxlamadan qalan test datası var, demodan əvvəl silinməlidir.

### M4. Web (`apps/web`, Next.js App Router, TypeScript strict)

**Ümumi:**
- **api-client:** `packages/api-client`. `/api/docs-json`-dan `openapi-typescript` ilə tiplər yaradılır, `openapi-fetch` ilə client. Generasiya skripti: `npm run gen:api`.
- **Struktur:** `src/app` (route-lar), `src/features/{live-map, arrivals, crowd-report, operator-dashboard, dispatch, auth}`, `src/entities/{route, stop, vehicle}`, `src/shared/{api, ui, lib}`. Feature-lar bir-birini import etmir, API çağırışları yalnız `shared/api` vasitəsilə gedir.
- **Kitabxanalar:** Tailwind CSS, TanStack Query, MapLibre GL, OpenFreeMap style: `https://tiles.openfreemap.org/styles/liberty`.
- **Dizayn:**
  - rənglər: brand `#0154E2`, mərcan `#F0643C`;
  - şrift: Onest (`next/font/google`);
  - mobil-first;
  - sadə və təmiz, iç-içə konteyner yoxdur.
- **Sıxlıq rəngləri:** `EMPTY` yaşıl `#16A34A`, `MODERATE` sarı `#EAB308`, `CROWDED` narıncı `#F97316`, `FULL` qırmızı `#DC2626`; data yoxdursa boz.
- **Mətn:** UI Azərbaycan dilində, kod ingiliscə.
- **API ünvanı:** `NEXT_PUBLIC_API_URL`, default `http://localhost:4000`.

**Prioritet:** b → c → d.

**a) Ortaq hissələr:**
- `useEventSource` hook (SSE, avtomatik yenidən qoşulma);
- `interpolatePosition`;
- `crowdLevelToColor`;
- `CrowdBadge`, `Button`, `Sheet` komponentləri.

**b) Operator (desktop):**
1. `/operator/login`: email və parol, `POST /auth/login`, token `localStorage`-da.
2. `/operator` (token yoxdursa login-ə yönləndir):
   - **Solda xəritə:**
     - `/vehicles?bbox=` ilə avtobuslar (sıxlıq rəngi), 2–5 s yenilənir;
     - `reserve-*` avtobusları fərqli ikonla;
     - `/crowding/heatmap`-dan bildiriş nöqtələri (grid lazım deyil).
   - **Sağda, yuxarıdan aşağı:**
     - KPI kartları (`/operator/overview`);
     - **Tövsiyələr** (`/operator/recommendations?status=PENDING`, 5 s polling; vaxt qalsa `/stream/operator`). Kartda xətt nömrəsi, səbəb mətni, "Qəbul et" / "Rədd et" düymələri;
     - **Ən sıx xətlər** cədvəli (`/crowding/routes`).
   - **Demo idarəsi:**
     - "Pik saatı göstər" düyməsi: `PUT /operator/sim-clock {time:"08:15"}`;
     - "Normal saat" düyməsi: `{reset:true}`.
   - Kiçik "Simulyasiya" nişanı.

**c) Sərnişin xəritəsi `/` (mobil):**
1. Bakı mərkəzli xəritə. Yuxarıda marşrut axtarışı (`/routes?query=`); `hasStops: false` olan marşrutlar seçilmir.
2. Marşrut seçiləndə:
   - xətti çəkilir (`/routes/:id`);
   - canlı avtobuslar `/stream/vehicles?routeId=` ilə gəlir, tiklər arasında interpolasiya olunur;
   - ikon rəngi sıxlıqdır.
3. Yaxın dayanacaqlar (`/stops/nearby`; geolocation yoxdursa "28 May" ətrafı). Dayanacağa basanda `/stops/[id]` açılır.
4. Zoom < 12 olanda avtobuslar gizlənir.

**d) Dayanacaq səhifəsi `/stops/[id]` və bildiriş:**
1. ETA siyahısı (`/stops/:id/arrivals`), 15 s yenilənir. Sətir formatı: `49 → 28 May · 3 dəq · [Sıx]`.
2. "Sıxlığı bildir" üzən düyməsi açır vərəqə. Vərəqədə:
   - marşrut avtomatik seçilir: 150 m-də ən yaxın avtobus, yoxdursa dayanacaqdakı marşrutlardan seçim;
   - 4 böyük seçim: Boş, Orta, Sıx, Dolu;
   - göndərmə: `POST /reports`;
   - uğurlu olanda "Təşəkkürlər" + 60 s gözləmə; 429 olanda "Bir az sonra yenidən cəhd edin";
   - `deviceId`: `localStorage`-da `crypto.randomUUID()`.

**M4 tamamlanma meyarı:** `npm run dev` ilə bu axın brauzerdə işləyir: sərnişin bildiriş göndərir → `demo:surge` → operator panelində tövsiyə görünür → "Qəbul et" → reserve avtobusu xəritədə görünür.

### M6. Docker + README
- **`apps/api/Dockerfile`:** multi-stage (deps → build → runtime), start əmri `prisma migrate deploy && prisma db seed && node dist/main`, port 4000.
- **`apps/web/Dockerfile`:** Next.js `output: "standalone"`, port 3000.
- **`docker-compose.yml`:**
  - `db`: `postgres:16-alpine`, healthcheck, volume;
  - `db-test`: ayrıca port;
  - `api`: `depends_on: db (healthy)`;
  - `web`: `NEXT_PUBLIC_API_URL`.
- **`.dockerignore`:** `node_modules`, `.env`, `dist`, `.next`.
- **`README.md`** (qısa) bunları əhatə etsin:
  - layihə nədir;
  - arxitektura (modullar, qatlar, hadisələr);
  - sıfırdan işə salma: `npm install` → `.env` (`.env.example`-dan) → `npm run db:migrate` → `npm run db:seed` → `npm run dev`;
  - ünvanlar:
    - web: http://localhost:3000;
    - operator: http://localhost:3000/operator;
    - Swagger: http://localhost:4000/api/docs;
  - skriptlər: `test`, `test:e2e`, `demo:surge`, `db:reset-ops`, `db:stats`;
  - data mənbələri: AYNA ictimai xəritəsi, opendata.az;
  - real data ilə simulyasiyanın fərqi;
  - "Docker faylları hazırdır, inkişaf kompüterində Docker olmadığı üçün sınanmayıb" qeydi.

  Yeni sənəd faylları yaratma, `docs/ADR.md` kifayətdir.

### M5. Testlər
- **E2E** (`apps/api/test`, supertest, `DATABASE_URL_TEST` qoruyucusu ilə; əsas baza heç vaxt təmizlənmir):
  1. Eyni xəttə 10 × `CROWDED` → `GET /operator/recommendations` 1 `PENDING` qaytarır.
  2. Tokensiz operator endpoint-i → 401.
  3. `GET /stops/:id/arrivals` sıralı siyahı qaytarır.
  4. Yanlış `level` → 400, vahid xəta formatında.
- **Web Vitest:** vaxt qalsa `interpolatePosition` və `crowdLevelToColor` testləri.
- **Yoxlama:** `npm test` və `npm run test:e2e` yaşıl olmalıdır.

## 5. Demo ssenarisi (3 dəq)
1. `npm run db:reset-ops`, sonra `npm run dev`.
2. **Sərnişin:** "28 May" dayanacağı açılır, ETA siyahısı görünür, xəritədə 49 nömrəli avtobuslar hərəkət edir.
3. "Sıxlığı bildir" → "Dolu".
4. `npm run demo:surge -- --route 49`.
5. **Operator paneli:** tövsiyə kartı görünür ("49 nömrəli xətt: son 10 dəqiqədə N yüksək sıxlıq bildirişi (X%)...") → "Qəbul et" → reserve avtobusu xəritədə görünür, KPI dəyişir.
6. **Kod:** Swagger, modul strukturu, `npm test`.

## 6. İş qaydaları
- **Commit-lər:** Conventional Commits, ingiliscə, kiçik hərflə, ≤ 72 simvol.
  - Nümunələr: `feat(web): add operator dashboard`, `build: add docker compose`.
- **Hər hissədən sonra:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` keçməlidir, sonra commit və push.
- **Asılılıqlar:** yeni asılılıq yalnız yuxarıda adı çəkilənlərdən. Versiyaları yüksəltmə.
- **Qısa işlə:** test və build çıxışından yalnız xülasəni və xətaları göstər.
- **Sonda `docs/PROGRESS.md`-ni yenilə:** nə bitdi, son commit hash, test sayı, coverage.
