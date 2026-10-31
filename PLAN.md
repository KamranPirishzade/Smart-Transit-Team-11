# BakuFlow: real vaxt ETA və sərnişin sıxlığı (Digital Azerbaijan Challenge, 4 saatlıq prototip)

> Claude Code-a ver: "Bu faylı oxu. Əvvəlcə **plan mode**-da işlə: strukturu və mərhələləri təsdiqlə. Sonra mərhələ-mərhələ icra et. Hər mərhələdən sonra testlər və build keçsin, ayrıca commit et."

---

## 0. Problem və məqsəd

**Kontekst:** Bakıda pik saatlarda marşrutlarda gözləmə vaxtı qeyri-müəyyəndir. Bəzi xətlərdə avtobus boş gedir, digərlərində sərnişinlər dayanacaqda qalır. Sərnişin sıxlığı real vaxtda görünmür, dispetçerlər dinamik tənzimləmədə çətinlik çəkir.

**Sərnişin modulu:**
1. Marşrutların gözlənilən gəliş vaxtı (ETA) və avtobusların xəritədə real vaxtda yeri. Data mock-dur.
2. Sərnişin avtobusun sıxlıq səviyyəsini bildirə bilir.

**Operator modulu:**
3. Sərnişin bildirişləri və GPS koordinatları əsasında sıxlıq xəritəsi.
4. Bir xətt üzrə **10 dəqiqə ərzində yüksək sıxlıq** çox qeydə alınarsa, panelə **"ehtiyat avtobus ayır"** tövsiyəsi düşür. Operator qəbul edəndə ehtiyat avtobus xəritədə görünür.

**Qiymətləndirmədə əsas:** arxitektura, clean code, codebase dizaynı. Bunlar mütləqdir:
- unit testlər;
- Docker;
- real database (PostgreSQL);
- Swagger.

**Qərarlar** (komanda ilə razılaşdırılıb):

| Mövzu | Qərar |
| --- | --- |
| Struktur | Monorepo (npm workspaces): **Next.js** (web) + **NestJS** (api) |
| Database | **PostgreSQL + Prisma**. Kompüter başqasınındır, Windows-dur, Docker yoxdur. Ona görə DB **Neon** bulud Postgres-dir (bax 0.1). Dockerfile və `docker-compose.yml` repo-da yazılır, vaxt qalsa sınanır |
| Real vaxt | **SSE** (server → brauzer); bildirişlər adi `POST` |
| Data | **Real AYNA dayanacaqları və marşrutları** (əvvəlki layihədən) + opendata.az BakuBus sərnişin datası. Avtobus hərəkəti, ETA və sıxlıq mock |
| Simulyasiya | **Bütün 208 marşrut** |
| Auth | Operator üçün sadə **JWT** |
| Komanda | 1 nəfər + Claude Code, lokal Docker demo |

### 0.1 Mühit: başqasının Windows kompüteri, Docker yoxdur

| Məsələ | Qərar |
| --- | --- |
| **Database** | **Neon** (bulud PostgreSQL, pulsuz, quraşdırma yoxdur). neon.tech → GitHub ilə giriş → layihə → iki branch və ya iki baza: `bakuflow` və `bakuflow_test` → connection string-ləri `.env`-ə. Claude Code onsuz da internet tələb edir, ona görə bulud DB əlavə risk yaratmır. Prisma üçün `?sslmode=require` lazımdır. |
| **Ehtiyat DB** (internet zəifdirsə) | `embedded-postgres` npm paketi: real Postgres binary-lərini npm ilə yükləyir və Node prosesindən işə salır. Admin hüququ və quraşdırma tələb etmir. Skript: `npm run db:local`. Yalnız Neon işləməsə istifadə et. |
| **Paket meneceri** | npm workspaces (pnpm quraşdırmaq lazım deyil). |
| **Skriptlər** | **yalnız cross-platform:** bash, `rm -rf`, `export` yoxdur. Node/TS skriptləri `tsx` ilə, env üçün `cross-env`, silmək üçün `rimraf`. Yollar `path.join` ilə. |
| **Sətir sonları** | `.gitattributes`: `* text=auto eol=lf`. `.editorconfig` əlavə et. |
| **Docker** | Dockerfile-lar və `docker-compose.yml` yazılır, amma bu kompüterdə sınanmır. README-də dürüst qeyd olunur. |
| **Yad kompüter** | açar və parollar yalnız `.env`-də (`.gitignore`-da). İş GitHub-a push olunur. Sonda brauzer, GitHub və Neon sessiyalarından çıx. |

**Başlamazdan əvvəl yoxla** (PowerShell):
```
node -v      # 20+ olmalıdır
npm -v
git --version
```
Node yoxdursa və admin hüququ yoxdursa: nodejs.org-dan **Windows Binary (.zip)** yüklə, aç, qovluğu PATH-ə əlavə et (cari sessiya üçün: `$env:Path = "C:\node;" + $env:Path`).

**AYNA datası:** `transporttech-navi` GitHub repo-sundan götür:
- `public/data/stops.json`
- `public/data/buses.json`
- `public/data/bus-lines-ayna.geojson`
- `data/raw/opendata/bakubus_daily_2026.csv`

Bunları `data/seed/`-ə kopyala. Yollar: `git clone`, sonra kopyala, və ya GitHub-da "Download raw file".

---

## 1. Tech stack

| Qat | Seçim | Niyə |
| --- | --- | --- |
| Monorepo | **npm workspaces** | Node ilə gəlir, əlavə quraşdırma yoxdur (yad Windows kompüteri üçün vacib); `apps/*` + `packages/*` |
| Backend | **NestJS** (TypeScript strict) | modullar, DI, guard, pipe, `@Sse`, `@nestjs/swagger`, Jest daxilində |
| ORM / DB | **Prisma** + **PostgreSQL 16** | tipli sorğular, migrasiya, seed |
| Validasiya | `class-validator` + `class-transformer` (DTO), konfiq üçün `zod` | Swagger DTO-dan avtomatik qurulur |
| API sənədi | `@nestjs/swagger` → `/api/docs`, `/api/docs-json` | tələb |
| Daxili hadisələr | `@nestjs/event-emitter` | modullar bir-birini birbaşa çağırmır (aşağı bağlılıq) |
| Auth | `@nestjs/jwt` + `passport-jwt`, `bcrypt` | operator endpoint-ləri qorunur |
| Rate limit | `@nestjs/throttler` | spam bildirişlərə qarşı |
| Frontend | **Next.js** (App Router, TypeScript strict), **Tailwind**, **MapLibre GL** + OpenFreeMap | əvvəlki layihənin dizaynı təkrar istifadə olunur |
| Server state | **TanStack Query** | REST keşi və invalidation |
| API tipləri | **openapi-typescript** (Swagger JSON → `packages/api-client`) | contract-first: backend dəyişəndə frontend tipləri də dəyişir |
| Test | api: **Jest** (unit) + **supertest** (e2e, test DB); web: **Vitest** + Testing Library | |
| Keyfiyyət | ESLint + Prettier, `tsc --noEmit` | |
| Konteyner | Docker multi-stage (api, web standalone), `docker-compose.yml` (db, api, web) | bir əmrlə qalxır |

Node 20 LTS. Paket versiyalarını quraşdırma zamanı ən son stabil versiyadan götür və lockfile-da dəqiq saxla (`--save-exact`).

---

## 2. Arxitektura

```
┌──────────── apps/web (Next.js) ─────────────┐        ┌──────────────── apps/api (NestJS) ────────────────┐
│ /            Sərnişin: xəritə, dayanacaq,   │  REST  │ network      marşrut, dayanacaq, xətt (read)       │
│              ETA, "Sıxlığı bildir"          │◄──────►│ simulation   avtobus yeri + ETA (saf domen)        │
│ /operator    Operator: sıxlıq xəritəsi,     │  SSE   │ crowding     bildirişlər, aqreqasiya, heatmap      │
│              tövsiyələr, ehtiyat avtobus    │◄───────│ dispatch     10 dəq qaydası → tövsiyə → ehtiyat    │
│ shared/api   openapi-typescript client      │        │ auth         operator JWT                          │
└─────────────────────────────────────────────┘        │ realtime     SSE axınları (vehicles, operator)     │
                                                        │ health                                              │
                                                        └──────────────────────┬─────────────────────────────┘
                                                                               │ Prisma
                                                                        ┌──────▼──────┐
                                                                        │ PostgreSQL  │
                                                                        └─────────────┘
```

### Backend qatları (hər modulda eyni quruluş, "hexagonal-lite")
```
modules/<name>/
  domain/          saf TypeScript: entity, value object, domen servisləri, qaydalar. Nest/Prisma importu YOXDUR.
  application/     use case-lər (məs. SubmitCrowdReport), portlar (interface: CrowdReportRepository)
  infrastructure/  Prisma repository-ləri (portların implementasiyası)
  presentation/    controller, DTO (Swagger dekoratorları ilə), SSE
  <name>.module.ts DI: port → adapter bağlantısı
```

**Qaydalar:**
- `domain` heç nədən asılı deyil.
- `application` yalnız `domain` və öz portlarından asılıdır.
- Controller-də biznes məntiqi yoxdur.

Bunun nəticəsi: domen və use case-lər **in-memory fake** ilə DB olmadan unit test olunur.

### Modullar arası axın (hadisələrlə)
```
POST /reports → SubmitCrowdReport (crowding)
   └─ emit "crowd.report.submitted"
        └─ dispatch: EvaluateRouteCongestion (son 10 dəq pəncərəsi)
             └─ qayda ödənirsə → Recommendation yarat (pending) → emit "dispatch.recommendation.created"
                  └─ realtime: /stream/operator-ə push
Operator "Qəbul et" → AcceptRecommendation → ReserveDispatch yarat → emit "dispatch.reserve.added"
   └─ simulation: həmin marşruta ehtiyat avtobus əlavə olunur → /stream/vehicles-də görünür
```

### Simulyasiya dizaynı (208 marşrut üçün performans)
- Avtobus yerləri **DB-də saxlanmır və hər tikdə yazılmır**. Yer zamanın saf funksiyasıdır:
  ```
  position(route, direction, vehicleIndex, now)
  ```
  marşrut xətti, interval (headway), fazanın sürüşməsi (marşrut id-sinin hash-i) və sürətdən hesablanır.
  - Deterministikdir: hər yenidən başlamada eyni nəticə.
  - Test etmək asandır.
  - Yaddaş və CPU yükü minimaldır.
- **Interval (headway)** marşrutun tələbindən gəlir: opendata.az BakuBus gündəlik gedişi, data yoxdursa default.
  - Pik saatlarda (07:30–09:30, 17:30–19:30) interval qısalır, sürət ×0,7 olur.
  - Konfiq `simulation.config.ts`-dədir.
- **Ehtiyat avtobus** (`ReserveDispatch`, DB-də): həmin marşrutun simulyasiyasına əlavə vehicle olaraq qoşulur.
- **Simulyasiya saatı** (`SimClock` portu): default real saat. Operator panelindən "demo saatı" təyin etmək olur (məs. 08:15 pik).
- **SSE tezliyi:** server hər **2 saniyədə** göndərir, yalnız müştərinin istədiyi hissəni:
  - `?routeId=` (bir marşrut);
  - `?bbox=minLon,minLat,maxLon,maxLat` (xəritədə görünən sahə, limit 800 avtobus).
  - Brauzer tiklər arasında yeri interpolasiya edir (səlis hərəkət).
- Bütün 208 marşrutda ~2 000+ avtobus olacaq. Ona görə **xəritə zoom < 12-də avtobusları göstərmir** (yalnız marşrut xətləri) və ya klaster edir.

### Sıxlıq modeli
- **Səviyyələr** (`CrowdLevel` enum):

  | Kod | UI | Bal |
  | --- | --- | --- |
  | `EMPTY` | Boş | 0 |
  | `MODERATE` | Orta | 1 |
  | `CROWDED` | Sıx | 2 |
  | `FULL` | Dolu | 3 |

- **Baza (mock):** marşrutun tələbi × saat profili (pik saatda yüksək). Məqsəd: bildiriş olmayanda da xəritə boş qalmasın.
- **Bildirişlər bazanı üstələyir:** son 10 dəqiqədəki bildirişlərin vaxta görə çəkili ortası. Yeni bildiriş daha çox çəkiyə malikdir (eksponensial azalma, yarımömür 5 dəq).
- **Heatmap:** son 10 dəqiqənin bildirişləri ~250 m-lik grid xanalarına (və ya geohash 7) yığılır. Xana üçün orta səviyyə və say hesablanır.

### Tövsiyə qaydası (dispatch)
`CongestionRule` (konfiq, domen servisi):
- son **10 dəqiqədə**, eyni marşrut (və istiqamət) üzrə;
- **CROWDED və ya FULL** bildirişlərin sayı **≥ 8** (`minHighReports`);
- **və** onların bütün bildirişlərdə payı **≥ 60%** (`minHighRatio`);
- **və** həmin marşrut üçün **açıq (pending) tövsiyə yoxdur** (dublikat olmasın).

Tövsiyə mətni:
> "49 nömrəli xətt: son 10 dəqiqədə 12 yüksək sıxlıq bildirişi (75%). 1 ehtiyat avtobus ayırmaq tövsiyə olunur."

Statuslar: `PENDING → ACCEPTED | DISMISSED`.

---

## 3. Data (əvvəlki layihədən)

**Mənbə:** `~/Downloads/ayna-hub-mvp/`. Bu faylları yeni layihənin `data/seed/` qovluğuna kopyala:

| Fayl (köhnə yer) | Məzmun |
| --- | --- |
| `public/data/stops.json` | 3 456 AYNA dayanacağı: kod, ad, koordinat, hub işarəsi, marşrutlar |
| `public/data/buses.json` | 208 marşrut: nömrə, daşıyıcı, tarif, uzunluq, müddət, istiqamətlər üzrə dayanacaq sırası |
| `public/data/bus-lines-ayna.geojson` | marşrut xətləri, hər istiqamət ayrıca |
| `data/raw/opendata/bakubus_daily_2026.csv` | BakuBus gündəlik gediş (63 marşrut üçün real tələb) |

**Seed** (`apps/api/prisma/seed.ts`):
- faylları oxuyur, idempotentdir (`upsert`);
- dayanacaqları marşrut xəttinə proyeksiya edir və `distanceFromStartM` yazır (ETA üçün lazımdır);
- bir operator hesabı yaradır: `operator@bakuflow.az` / parol `.env`-dən.

---

## 4. Data modeli (Prisma)

```prisma
model Route        { id Int @id; number String; carrier String?; tariffAzn Decimal?; lengthKm Float; durationMin Int
                     avgDailyPassengers Int?; directions RouteDirection[]; reports CrowdReport[]; recommendations Recommendation[] }
model RouteDirection { id Int @id @default(autoincrement()); routeId Int; direction Int; towards String
                     geometry Json  // [lon,lat][]
                     lengthM Float; stops RouteStop[]; route Route @relation(fields:[routeId], references:[id]); @@unique([routeId, direction]) }
model Stop         { id Int @id; code String; name String; lat Float; lon Float; isHub Boolean @default(false); routeStops RouteStop[] }
model RouteStop    { directionId Int; stopId Int; order Int; distanceFromStartM Float
                     direction RouteDirection @relation(fields:[directionId], references:[id]); stop Stop @relation(fields:[stopId], references:[id])
                     @@id([directionId, order]); @@index([stopId]) }
model CrowdReport  { id String @id @default(uuid()); routeId Int; direction Int?; vehicleId String?; stopId Int?
                     level CrowdLevel; lat Float; lon Float; deviceId String; createdAt DateTime @default(now())
                     route Route @relation(fields:[routeId], references:[id]); @@index([routeId, createdAt]); @@index([createdAt]) }
model Recommendation { id String @id @default(uuid()); routeId Int; direction Int?; reason String; highReports Int; totalReports Int
                     windowStart DateTime; windowEnd DateTime; status RecommendationStatus @default(PENDING)
                     createdAt DateTime @default(now()); resolvedAt DateTime?; resolvedBy String?; route Route @relation(fields:[routeId], references:[id]) }
model ReserveDispatch { id String @id @default(uuid()); routeId Int; direction Int; recommendationId String? @unique; createdAt DateTime @default(now()); active Boolean @default(true) }
model Operator     { id String @id @default(uuid()); email String @unique; passwordHash String; name String }
enum CrowdLevel { EMPTY MODERATE CROWDED FULL }
enum RecommendationStatus { PENDING ACCEPTED DISMISSED }
```

---

## 5. API (hamısı `/api` prefiksi ilə, Swagger tag-ları mötərizədə)

| Metod | Yol | Təsvir |
| --- | --- | --- |
| GET | `/routes?query=` | marşrut axtarışı (network) |
| GET | `/routes/:id` | marşrut, istiqamətlər, dayanacaqlar, xətt (network) |
| GET | `/stops/nearby?lat&lon&radius=500` | yaxın dayanacaqlar (network) |
| GET | `/stops/:id` | dayanacaq + keçən marşrutlar (network) |
| GET | `/stops/:id/arrivals?limit=10` | ETA siyahısı: marşrut, istiqamət, dəqiqə, avtobusun sıxlıq səviyyəsi (simulation) |
| GET | `/vehicles?routeId=` və ya `?bbox=` | avtobusların anlıq yeri, sıxlığı (simulation) |
| GET (SSE) | `/stream/vehicles?routeId=` və ya `?bbox=` | hər 2 s avtobus yerləri (realtime) |
| POST | `/reports` | sıxlıq bildirişi. Body: `routeId`, `direction?`, `vehicleId?`, `stopId?`, `level`, `lat`, `lon`, `deviceId`. Rate limit: bir `deviceId` üçün dəqiqədə 3 (crowding) |
| GET | `/crowding/heatmap?minutes=10` | grid xanaları: mərkəz, orta səviyyə, say (crowding) |
| GET | `/crowding/routes?minutes=10` | marşrutlar sıxlığa görə sıralı (crowding) |
| POST | `/auth/login` | `{email, password}` → `{accessToken}` (auth) |
| GET | `/operator/overview` 🔒 | KPI-lar: aktiv avtobus, son 10 dəq bildiriş, yüksək sıxlıqlı xətlər, açıq tövsiyələr (dispatch) |
| GET | `/operator/recommendations?status=` 🔒 | tövsiyələr (dispatch) |
| POST | `/operator/recommendations/:id/accept` 🔒 | qəbul et → ehtiyat avtobus (dispatch) |
| POST | `/operator/recommendations/:id/dismiss` 🔒 | rədd et (dispatch) |
| PUT | `/operator/sim-clock` 🔒 | demo saatı `{time: "08:15"}` və ya `{reset: true}` (simulation) |
| GET (SSE) | `/stream/operator` 🔒 | yeni bildiriş, tövsiyə, ehtiyat hadisələri (realtime). SSE header göndərə bilmir, ona görə token query-də (`?token=`) |
| GET | `/health` | DB bağlantısı daxil (health) |

**Ümumi qaydalar:**
- **Xəta formatı** vahiddir (global exception filter): `{ statusCode, error, message, path, timestamp }`.
- **DTO-lar** Swagger dekoratorları ilə: nümunə dəyərlər və enum-lar sənəddə görünsün.
- **Swagger:** `/api/docs`-da "Authorize" düyməsi (Bearer).

---

## 6. Frontend (`apps/web`)

### Struktur (feature-based)
```
src/
  app/                       route-lar: / , /stops/[id], /routes/[id], /operator, /operator/login
  features/
    live-map/                MapLibre xəritə, avtobus qatı, interpolasiya
    arrivals/                dayanacaq ETA siyahısı
    crowd-report/            "Sıxlığı bildir" vərəqəsi, ən yaxın avtobusun tapılması
    nearby-stops/
    operator-dashboard/      KPI, heatmap qatı, marşrut sıralaması
    dispatch/                tövsiyə kartları, qəbul/rədd
    auth/
  entities/                  route, stop, vehicle: tiplər, formatlayıcılar
  shared/
    api/                     generated client (packages/api-client) + fetcher + useEventSource
    ui/                      Button, Sheet, PickerSheet, Badge, CrowdBadge (əvvəlki AYNA dizaynından)
    lib/                     geo (haversine, interpolate), time
```

**Qaydalar:**
- Feature-lar bir-birini birbaşa import etmir, yalnız `entities` və `shared`.
- API çağırışları yalnız `shared/api` vasitəsilə gedir.

### Sərnişin ekranları (mobil, əvvəlki tətbiqin dizaynı)
1. **Xəritə:**
   - yaxın dayanacaqlar və yuxarıda marşrut axtarışı;
   - marşrut seçiləndə xətti və canlı avtobuslar;
   - avtobus ikonunun rəngi sıxlıqdır: yaşıl / sarı / narıncı / qırmızı.
2. **Dayanacaq səhifəsi:** ETA siyahısı "49 → 28 May · 3 dəq · 🟠 Sıx". Siyahı SSE və ya 15 s polling ilə yenilənir.
3. **"Sıxlığı bildir"** (üzən düymə → vərəqə):
   - GPS-ə görə 150 m-dəki ən yaxın avtobus avtomatik seçilir ("49 nömrəli avtobusdasınız?"). Yoxdursa marşrut seçicisi açılır.
   - 4 böyük seçim: Boş / Orta / Sıx / Dolu, ikonlu.
   - Göndər → "Təşəkkürlər" toast-u + 60 s gözləmə.
   - `deviceId` `localStorage`-da saxlanılan anonim UUID-dir.

### Operator ekranları (desktop)
1. **Login** (JWT `localStorage`-da; demo üçün kifayətdir).
2. **Panel:**
   - solda xəritə: heatmap qatı + avtobuslar (sıxlıq rəngi) + ehtiyat avtobuslar (fərqli ikon);
   - sağda yuxarıdan aşağı:
     - KPI kartları;
     - **Tövsiyələr** (canlı, SSE): kartda xətt, səbəb, "Qəbul et" / "Rədd et";
     - **Ən sıx xətlər** cədvəli.
   - Qəbul edəndə ehtiyat avtobus xəritədə görünür, KPI dəyişir.
3. **Demo idarəsi** (kiçik panel): demo saatı (07:00–20:00 slider), "Pik saatı göstər" düyməsi.

### Dizayn
Əvvəlki AYNA Keçid tətbiqinin tokenləri: rənglər (brand `#0154E2`, mərcan `#F0643C`), Onest şrifti, Sheet, PickerSheet, üzən naviqasiya. Lazım olan UI komponentlərini `ayna-hub-mvp/components/ui`-dan köçür və uyğunlaşdır.

---

## 7. Testlər

### api: unit (Jest, DB-siz, in-memory fake repository-lər ilə)
- **`ScheduleSimulator`:**
  - `t=0`-da avtobus başlanğıcdadır;
  - xəttin sonunda dövr başa çatır;
  - interval düzgündür;
  - pik saatda interval qısalır;
  - deterministikdir.
- **`EtaCalculator`:**
  - ETA ≥ 0;
  - dayanacaq avtobusun arxasındadırsa növbəti avtobus götürülür;
  - nəticə sıralanır.
- **`CrowdAggregator`:**
  - 10 dəq pəncərəsindən kənar bildirişlər sayılmır;
  - yeni bildirişlərin çəkisi daha böyükdür;
  - bildiriş yoxdursa baza istifadə olunur.
- **`CongestionRule`:**
  - hədd altında tövsiyə yoxdur;
  - say və pay ödənəndə tövsiyə yaranır;
  - açıq tövsiyə varsa dublikat yaranmır.
- **`SubmitCrowdReport` use case:** validasiya, hadisə emit olunur.
- **`AcceptRecommendation`:**
  - status dəyişir, `ReserveDispatch` yaranır;
  - artıq həll olunmuş tövsiyəyə təkrar qəbul xəta qaytarır.

### api: e2e (supertest + docker-dakı ayrıca test DB)
1. `POST /reports` × 10 (eyni xətt, `CROWDED`) → `GET /operator/recommendations` → 1 `PENDING` tövsiyə.
2. Operator endpoint-i tokensiz → 401.
3. `GET /stops/:id/arrivals` → sıralı ETA siyahısı.
4. Yanlış `level` → 400, vahid xəta formatında.

### web (Vitest)
- `interpolatePosition`, `crowdLevelToColor`, `nearestVehicle` utilitləri.
- `CrowdReportSheet` komponent testi: seçim → submit çağırılır.

**Hədəf:** domen qatında ≥ 80% coverage (`npm run -w apps/api test:cov`).

---

## 8. Docker

> **Bizdə Docker yoxdur.** Demo Neon Postgres ilə `npm run dev` üzərindən gedir. Aşağıdakı fayllar yenə də yazılır: arxitektura və deploy hazırlığının sübutu. e2e testlər Neon-da ayrıca `bakuflow_test` bazası ilə işləyir. Docker sonradan quraşdırılsa, `docker compose up --build` dəyişiklik olmadan işləməlidir.


`docker-compose.yml`:
- **`db`:** `postgres:16-alpine`, healthcheck, volume.
- **`db-test`:** e2e üçün, ayrıca port.
- **`api`:**
  - multi-stage Dockerfile;
  - start: `prisma migrate deploy && prisma db seed && node dist/main`;
  - port 4000, `depends_on: db (healthy)`.
- **`web`:** Next.js `output: "standalone"`, port 3000, `NEXT_PUBLIC_API_URL`.

`.env.example`:
```
DATABASE_URL, JWT_SECRET, OPERATOR_EMAIL, OPERATOR_PASSWORD, NEXT_PUBLIC_API_URL
```

**Bir əmr:** `docker compose up --build`. Sonra:
- web: <http://localhost:3000>
- operator: <http://localhost:3000/operator>
- Swagger: <http://localhost:4000/api/docs>

---

## 9. Repo strukturu

```
bakuflow/
  apps/
    api/  src/{main.ts, app.module.ts, common/(filters, config, sim-clock), modules/(network, simulation, crowding, dispatch, auth, realtime, health)}
          prisma/{schema.prisma, migrations/, seed.ts}  test/(e2e)
    web/  src/(yuxarıdakı struktur)
  packages/
    api-client/      openapi-typescript-dən generasiya olunmuş tiplər + fetcher
    config/          ortaq tsconfig, eslint
  data/seed/         AYNA və opendata faylları
  scripts/demo-surge.ts   seçilmiş xəttə 10 dəq ərzində 12 yüksək bildiriş göndərir (demo üçün)
  docs/              ARCHITECTURE.md (diaqram + qatlar), ADR.md (qərarlar və səbəbləri), DEMO.md (ssenari)
  docker-compose.yml  .env.example  CLAUDE.md  README.md
```

**`CLAUDE.md`** (Claude Code ilk addımda yaratsın):
- qat qaydaları (domain → heç nə; application → domain + port; infrastructure → Prisma);
- adlandırma: fayllar kebab-case, siniflər PascalCase;
- hər use case üçün unit test;
- UI mətni Azərbaycan dilində, kod və identifikatorlar ingiliscə;
- yeni asılılıq əlavə etməzdən əvvəl soruş.

---

## 10. 4 saatlıq icra planı (1 nəfər + Claude Code)

| Vaxt | Mərhələ | Nəticə |
| --- | --- | --- |
| 0:00–0:20 | **M1 Skelet:** npm workspaces monorepo, NestJS və Next.js, Prisma sxemi, migrasiya, seed (AYNA datası). DB: Neon bulud Postgres (bax bölmə 0.1) | `npm run -w apps/api prisma:migrate` və seed işləyir |
| 0:20–1:10 | **M2 Network + Simulation:** network endpoint-ləri, `ScheduleSimulator`, `EtaCalculator`, `/vehicles`, `/stops/:id/arrivals`, SSE `/stream/vehicles`, Swagger, unit testlər | Swagger-də ETA və avtobus yerləri |
| 1:10–1:45 | **M3 Crowding + Dispatch + Auth:** `POST /reports`, aqreqasiya, heatmap, `CongestionRule` (hadisələrlə), tövsiyələr, accept → reserve, JWT, operator SSE, unit testlər | `demo-surge` skripti tövsiyə yaradır |
| 1:45–2:45 | **M4 Web:** api-client generasiyası, sərnişin xəritəsi + dayanacaq ETA + "Sıxlığı bildir", operator login + panel (heatmap, tövsiyələr, accept) | tam demo axını brauzerdə |
| 2:45–3:15 | **M5 Testlər:** e2e (4 ssenari), web Vitest, coverage | `npm test` yaşıl |
| 3:15–3:35 | **M6 Docker + sənədlər:** api və web Dockerfile, tam compose (yazılır; Docker yoxdursa sınanmır, README-də qeyd olunur), README, ARCHITECTURE.md, ADR.md, DEMO.md | lokal `npm run dev` ilə demo işləyir; compose faylı hazırdır |
| 3:35–4:00 | **Ehtiyat vaxt:** cilalama, demo məşqi | |

**Vaxt çatmırsa, bu sıra ilə kəs:**
1. web Vitest;
2. demo saatı slider-i (yerinə sabit "pik" düyməsi);
3. heatmap grid (yerinə bildirişlərin nöqtə qatı);
4. operator SSE (yerinə 5 s polling).

**Kəsilməyənlər:** domen unit testləri, Swagger, Docker, 10 dəq qaydası.

---

## 11. Demo ssenarisi (3 dəq)

1. **Sərnişin:** "28 May" dayanacağı → ETA siyahısı, xəritədə 49 nömrəli avtobuslar hərəkət edir.
2. **Bildiriş:** avtobusun yanında "Sıxlığı bildir" → "Dolu" → göndərilir.
3. **Kütləvi bildiriş:** `npm run demo:surge -- --route 49` (və ya operator panelindəki demo düyməsi) 10 dəqiqəlik bildiriş axınını sürətli göndərir.
4. **Operator:**
   - heatmap 49 xətti boyunca qırmızılaşır;
   - **tövsiyə kartı** canlı düşür: "12 yüksək bildiriş (75%) → 1 ehtiyat avtobus";
   - **Qəbul et** → xəritədə ehtiyat avtobus çıxır, KPI yenilənir.
5. **Kod:** Swagger (`/api/docs`), modul strukturu, `npm test` (yaşıl), `docker compose ps`.

---

## 12. Dürüstlük

- Avtobus yerləri, ETA və baza sıxlığı **simulyasiyadır**. Dayanacaqlar, marşrutlar, xətlər və sərnişin tələbi realdır: AYNA və opendata.az.
- Operator panelində kiçik "simulyasiya" nişanı qalır. README-də bu bölgü cədvəllə yazılır.
- **Real GPS və avtomatik sərnişin sayğacı (APC) qoşulanda** yalnız `simulation` modulunun adapteri dəyişir. Domen və UI eyni qalır. Bu, arxitekturanın əsas arqumentidir.
