# LineApp — Project Skill / Cheat Sheet

แอป LINE LIFF สำหรับเกษตรกร บันทึกรายรับ-รายจ่ายแยกตามรอบการเพาะปลูก พร้อม AI ช่วยแยกข้อมูลจากข้อความธรรมชาติ

## 1. โครงสร้างโปรเจค

```
LineApp/
├── docker-compose.yml          # รวมทั้ง stack (frontend + 2 backend)
├── .env.example                # ตัวอย่าง env (Postgres / Docs / CORS / Vite)
├── README.md
├── k6.exe / k6.js              # load test
├── Front/
│   └── lineapp/                # React 19 + Vite + TS + Tailwind
└── Back/
    ├── user-service/demo/      # Spring Boot 4 — CRUD + LINE Auth + JWT
    └── ai-service/             # FastAPI — LLM extract transaction
```

Postgres รันบน host (ไม่อยู่ใน compose) — container อ้างผ่าน `host.docker.internal`

## 2. Stack

| Layer | เทคโนโลยี |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind, react-aria-components, Chart.js, react-i18next (th/en/jp), MUI X DatePicker, dayjs |
| User Service | Spring Boot 4.0.6, Java 25, Spring Security, Spring Data JPA, PostgreSQL driver, JJWT 0.11.5, springdoc-openapi 2.5 |
| AI Service | FastAPI, Pydantic v2, `requests`, python-dotenv, LLM = Typhoon (`typhoon-v2.5-30b-a3b-instruct`) ผ่าน `opentyphoon.ai` หรือ `thaillm.or.th` |
| DB | PostgreSQL (host) |
| Deploy | Docker Compose, multi-stage Dockerfile |

## 3. Database Schema (ตามจริงใน entity)

```
users(user_id PK UUID, user_sub, user_email, user_name, user_picture, created_at, lastlogin_at)
cycle(cycle_id PK UUID, user_id FK, name, farm_type, start_date, end_date, status, icon, created_at)
category(category_id PK UUID, user_id FK, name, type[income|expense], created_at)
transaction(tx_id PK UUID, user_id FK, cycle_id FK?, category_id FK?, tx_type[income|expense],
            amount DECIMAL(19,4), note TEXT, tx_date, created_at)
```

- `cycle_id` และ `category_id` ใน transaction เป็น nullable
- ทุกตารางใช้ UUID เป็น PK และ `@CreationTimestamp` สำหรับ created_at

## 4. User Service (Spring Boot)

Base URL: `http://localhost:8080`

### Endpoints หลัก

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/line` | แลก LINE OAuth code → JWT + AuthRes |
| GET | `/api/cycle?userId=` หรือ `/api/cycle/user/{userId}` | list cycles ของ user |
| GET | `/api/cycle/{cycleId}?userId=` | ดึงรอบเดียว (ตรวจ ownership) |
| POST/PUT | `/api/cycle` | create / update cycle |
| DELETE | `/api/cycle?cycleId=` | delete |
| GET | `/api/category?userId=&type=` หรือ `/api/category/user/{userId}` | list categories (type optional) |
| GET | `/api/category/{categoryId}?userId=` | ดึงหมวดเดียว |
| POST/PUT/DELETE | `/api/category` | create / update / delete |
| GET/POST/PUT/DELETE | `/api/transaction[/{txId}]` | CRUD (POST/PUT รับ JSON) |
| - | `/swagger-ui/index.html`, `/api/docs/**`, `/v3/api-docs/**` | API docs (Basic Auth) |

### Conventions

- **DTO ทั้งหมดเป็น Java `record`** (ทั้ง `dto/req/*`, `dto/res/*`, `dto/ApiRes`) — accessor เป็น `obj.field()` ไม่ใช่ `getField()`
- Response wrapper: `ApiRes<T> { success, message, data, typeError }` พร้อม static factory `ApiRes.success(data, msg)` / `ApiRes.failure(msg, type)`
- HTTP status map ผ่าน `ApiResMapper` ตาม `TypeError` enum (`NOT_FOUND→404`, `FORBIDDEN→403`, `CONFLICT→409`, `INVALID_CREDENTIAL→401`, `VALIDATION_ERROR→400`, `INTERNAL_ERROR→500`)
- Entity ยังเป็น mutable class (JPA ต้องการ) — มี getter/setter ครบ
- ตาราง `transaction` ต้อง quote: `@Table(name = "\`transaction\`", schema = "public")` (เพราะเป็น reserved word)

### Security (`SecurityConfig.java`)

2 filter chains:
1. `/swagger-ui/**, /api/docs/**, /v3/api-docs/**` → HTTP Basic (`DOCS_USERNAME`/`DOCS_PASSWORD`, default `admin/admin`)
2. ทุก endpoint อื่น → `permitAll()` (รับ JWT แต่ยังไม่บังคับ validate ใน filter — frontend ส่ง `Authorization: Bearer` มาเอง)

CORS เปิด origin จาก env `APP_CORS_ALLOWED_ORIGINS` (comma-separated)

### OpenAPI (`OpenApiConfig.java`)

มี `bearerAuth` security scheme (HTTP Bearer, format JWT) → Swagger UI มีปุ่ม **Authorize** กรอก JWT ได้

### LINE Login flow (`LineAuthService`)

1. รับ `code` → POST `https://api.line.me/oauth2/v2.1/token` ได้ `access_token + id_token`
2. POST `/verify` กับ `id_token` ได้ `sub, email, name, picture`
3. Upsert `UserEntity` ตาม `user_sub`
4. GET `https://api.line.me/v2/profile` ด้วย access_token ได้ `userId, displayName, pictureUrl`
5. `JwtUtil.generateToken(user.userId, displayName)` → คืน `AuthRes(token, userId, lineUserId, displayName, pictureUrl)`

JWT: HS256, secret/expiration จาก env `JWT_SECRET`/`JWT_EXPIRATION`

## 5. AI Service (FastAPI)

Base URL: `http://localhost:8000`

### Endpoint

`GET /parse?text=...&userId=...` → `AiParseResponse { source_model, data, message, structured_ok }`

### Flow (`extract_service.py`)

1. ดึง `cycles` และ `categories` ของ user จาก user-service (`/api/cycle?userId=`, `/api/category?userId=`)
2. Build prompt (`prompt/mgs.py`) แนบรายการ cycles/categories ที่มีจริง
3. เรียก LLM (`llm_service.run_llm`) — Typhoon ผ่าน opentyphoon หรือ thaillm
4. Parse JSON output → `AiExtractLlmRaw { main, price, type, cycleName, cycleFarmType, categoryName }`
5. Resolve `cycleName + farmType → cycleId` และ `categoryName → categoryId` แบบ exact match
6. Sanitize: ถ้า LLM แต่ง UUID เองที่ไม่อยู่ในรายการจริง → ล้างเป็น null
7. ตอบกลับ `AiExtractStructured { main, price, type, cycleId?, cycleName?, categoryId?, categoryName? }`
8. Retry สูงสุด `EXTRACT_MAX_RETRIES` ครั้ง (default 2) เมื่อ LLM ตอบ format เพี้ยน

### Fallback "ยายตอบหลาน"

ถ้าข้อมูลไม่ครบ LLM จะตอบเป็นข้อความสั้น ๆ ลงท้ายด้วย "จ๊ะ" / "จ๋า" — service ถือเป็น valid response (ไม่ retry)

### Network quirk

`client/lineapp_api.py` resolve host เป็น IPv4 ก่อนเสมอ (กัน `host.docker.internal` ถูก resolve เป็น IPv6 → Errno 101) — มี fallback ไป Docker default gateway

## 6. Frontend (React + Vite)

### Routes (`routes/Index.tsx`)

| Path | Page | Auth |
|---|---|---|
| `/callback` | `LineCallback` | public — รับ `?code=` จาก LINE |
| `/` | `Sum` (ภาพรวม) | ต้อง login |
| `/cycle` | `Cycle` (จัดการรอบ) | ต้อง login |
| `/list` | `List` (รายการรับ-จ่าย) | ต้อง login |
| `/analytics` | `Analytic` (กราฟ) | ต้อง login |
| `/settings` | `Setting` | ต้อง login |

`RequireAuth` ห่อ children — ถ้าไม่มี token จะ redirect ไป LINE OAuth อัตโนมัติ

### Key modules

- `lib/api.ts` — HTTP client, อ่าน base URL จาก `VITE_API_BASE_URL`, แนบ JWT จาก `localStorage["auth_token"]` ทุก request, แกะ `ApiRes` envelope, throw `ApiError` พร้อม `typeError`
- `lib/auth.ts` — เก็บ token + user ใน localStorage (`auth_token`, `auth_user`), `exchangeLineCode(code)` เรียก `/api/auth/line`
- `lib/userService.ts` — typed API client: `cycleApi`, `categoryApi`, `transactionApi` (ทุก method แนบ `userId` อัตโนมัติจาก `auth.getUser()`)
- `lib/lineLogin.ts` — สร้าง LINE OAuth URL จาก `VITE_LINE_CHANNEL_ID` + `VITE_LINE_REDIRECT_URI`
- `i18n.ts` — แปลภาษา th/en/jp (key เก็บใน object literal เดียว) บันทึก lang ใน `localStorage["language"]`

### UI patterns

- Tailwind + CSS variables (`var(--primary)`, `var(--surface)`, `var(--text)` ฯลฯ) สำหรับ theming
- Bottom sheet pattern: backdrop `fixed inset-0 z-40 bg-black/35` + panel `bottom-sheet-panel max-w-[420px]`
- Icon picker ใช้ emoji map ใน `assets/Iconlist.tsx`
- Helper `isIconName()` ตรวจ icon string ก่อน lookup map (ใน `Cycle.tsx`, `List.tsx`)

## 7. รัน / Build

### Docker dev mode (default) — hot reload ทุก service

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

ทุก service มี hot reload หลังแก้โค้ดบน host:

| Service | Dockerfile stage | กลไก | Trigger |
|---|---|---|---|
| frontend | `dev` | Vite dev server + HMR | บันทึก `.tsx/.ts/.css` → reload เอง |
| user-service | `dev` | `./mvnw spring-boot:run` + spring-boot-devtools | IDE compile-on-save → `target/classes/*.class` เปลี่ยน → devtools restart context |
| ai-service | (เดิม) | `uvicorn --reload` + `WATCHFILES_FORCE_POLLING` | บันทึก `.py` → uvicorn restart |

**Mounts ที่ทำให้ hot reload ใช้ได้:**
- frontend: bind `./Front/lineapp:/app` + named volume `frontend-node-modules:/app/node_modules`
- user-service: bind `./Back/user-service/demo:/app` (รวม `src/` + `target/`) + named volume `user-service-m2:/root/.m2`
- ai-service: bind `./Back/ai-service/src:/app/src`

**Polling**: บน Windows host bind mount ไม่ส่ง inotify event → ต้องใช้ polling ทุกตัว
- Vite: `server.watch.usePolling=true` ใน `vite.config.ts`
- Spring DevTools: `SPRING_DEVTOOLS_RESTART_POLL_INTERVAL=2s`
- uvicorn: `WATCHFILES_FORCE_POLLING=true`

**Endpoint:**
- Frontend: <http://localhost:5173> (Vite dev server, HMR ผ่าน WebSocket)
- User Service: <http://localhost:8080>, docs: `/api/docs` (admin/admin)
- AI Service: <http://localhost:8000>

### วิธี trigger reload ของ user-service (Java)

1. **IDE compile-on-save** (แนะนำ) — เปิดให้ IDE คอมไพล์อัตโนมัติเมื่อ save:
   - VSCode + Java Extension Pack: เปิดอยู่แล้ว
   - IntelliJ IDEA: `Settings → Build → Compiler → Build project automatically` + กด Ctrl+F9 หรือเปิด `Registry → compiler.automake.allow.when.app.running`
2. **Manual compile** — `docker compose exec user-service ./mvnw compile`

### Switch กลับเป็น production build

ลบ `target: dev` กับ `volumes:` ที่ bind source code ออกจาก `docker-compose.yml` (frontend จะ build → nginx serve, user-service จะ build JAR → JRE runtime)

### Dev mode (host — ไม่ผ่าน Docker)

```powershell
cd Front/lineapp && npm install && npm run dev
cd Back/user-service/demo && .\mvnw spring-boot:run
cd Back/ai-service && python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r requirements.txt && uvicorn src.main:app --reload --port 8000
```

## 8. Env ที่ต้องตั้ง

| ไฟล์ | ตัวแปรสำคัญ |
|---|---|
| root `.env` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DOCS_USERNAME`, `DOCS_PASSWORD`, `APP_CORS_ALLOWED_ORIGINS`, `VITE_*` |
| `Back/user-service/demo/.env` | `LINE_CLIENT_ID`, `LINE_CLIENT_SECRET`, `LINE_REDIRECT_URI`, `JWT_SECRET`, `JWT_EXPIRATION` |
| `Back/ai-service/.env` | `api_key_openai`, `api_key_thaillm`, `OPENTYPHOON_API_KEY`, `LINEAPP_API_BASE`, `LINEAPP_DEFAULT_USER_ID`, `EXTRACT_MAX_RETRIES` |
| `Front/lineapp/.env` | `VITE_API_BASE_URL`, `VITE_LINE_CHANNEL_ID`, `VITE_LINE_REDIRECT_URI` (หรือ `VITE_LINE_LOGIN_URL`) |

ทุก `.env` ถูก git ignore — ดู template ที่ `.env.example` แต่ละชั้น

## 9. กฎ / เคล็ดลับเวลาแก้โค้ด

1. **DTO ใหม่ฝั่ง user-service → ใช้ `record`** ไม่ใช่ class; accessor เป็น `obj.field()` (เช่น `req.userId()` ไม่ใช่ `req.getUserId()`); `ApiRes` ก็เป็น record ด้วย ใช้ `res.success()` / `res.message()` / `res.typeError()` / `res.data()`
2. **Entity ยังเป็น class** เพราะ JPA ต้องการ no-arg constructor + mutable fields
3. **ใส่ `@JsonProperty` ใน record component** ได้ตรง ๆ เพื่อ map snake_case จาก LINE API (เช่น `access_token`, `id_token`, `error_description`)
4. **เพิ่มฟิลด์ใน transaction** ต้องอัปเดต: entity → DTO record (req + res) → service mapping → frontend `Transaction` type + payload type
5. **i18n**: เพิ่ม key ต้องเพิ่มทั้ง 3 ภาษา (`th`, `en`, `jp`) ใน `Front/lineapp/src/i18n.ts`
6. **API ของ user-service ยังไม่บังคับ JWT validate** ใน filter chain (`.anyRequest().permitAll()`) — ตอน production ต้องเพิ่ม JWT filter เอง; frontend แนบ Bearer มาก็แค่ pass-through
7. **AI service ดึง cycles/categories ก่อนเรียก LLM** เพื่อให้ LLM map ชื่อ → UUID ได้ตรง; ถ้า user ไม่มีรอบ/หมวด LLM จะตอบ `cycleId`/`categoryId` = null
8. **OpenAPI auth**: ใช้ปุ่ม Authorize ใน Swagger UI กรอก JWT (ไม่ต้องใส่คำว่า `Bearer`) — config อยู่ที่ `OpenApiConfig.java`
9. **CORS dev**: ถ้าเปลี่ยน port frontend ต้องอัปเดต `APP_CORS_ALLOWED_ORIGINS` ใน user-service env
10. **Docker → host DB**: ใช้ `host.docker.internal:5432` (มี `extra_hosts: host-gateway` ใน compose แล้ว)
