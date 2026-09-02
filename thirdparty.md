# Third-party API ใน LineApp

สรุปบริการภายนอกที่โปรเจกต์เรียกจริง (ไม่รวม API ของเราเอง เช่น `user-service` / `ai-service`)

| # | ผู้ให้บริการ | ใช้ทำอะไร | Auth | เรียกจาก |
| --- | --- | --- | --- | --- |
| 1 | LINE Platform | Login, LIFF, Chatbot (Reply/Push/Webhook) | OAuth + Channel Access Token | Front + user-service |
| 2 | TMD NWP API | พยากรณ์อากาศรายชั่วโมง / รายวัน | Bearer token | user-service |
| 3 | TMD Weather Warning | ประกาศเตือนภัยอากาศ (XML) | `uid` + `ukey` query | user-service |
| 4 | NABC Agri Price | ราคาสินค้าเกษตรรายวัน/สัปดาห์/เดือน | ไม่มี | user-service |
| 5 | MOPH HCode | จังหวัด / อำเภอ / ตำบล | JWT (username/password) | user-service (optional) |
| 6 | OpenTyphoon | LLM หลัก (parse, สรุปอากาศ/ราคา/รอบปลูก) | API key (OpenAI-compatible) | ai-service |
| 7 | ThaiLLM | LLM สำรอง (Typhoon → KBTG) | `apikey` header | ai-service |

---

## 1. LINE Platform

LINE เป็นทั้งช่องทาง login และ chatbot ของแอป

เอกสาร: [LINE Developers](https://developers.line.biz/)

### 1.1 LINE Login (OAuth 2.1)

ใช้ให้ user เข้าสู่ระบบบนเว็บ

| รายการ | ค่า |
| --- | --- |
| Authorize | `GET https://access.line.me/oauth2/v2.1/authorize` |
| Token | `POST https://api.line.me/oauth2/v2.1/token` |
| Verify ID token | `POST https://api.line.me/oauth2/v2.1/verify` |
| Profile | `GET https://api.line.me/v2/profile` |
| Scope | `profile openid` |
| Auth | `client_id` + `client_secret` (token exchange), Bearer access token (profile) |

**Flow**

เส้น login แยกตามที่เปิดแอป:

- **เบราว์เซอร์นอก** → Front ส่งไป authorize ของ LINE (`lineLogin.ts`) มี `line_oauth_state` → กลับ `/callback` → `POST /api/auth/line`
- **ในแอป LINE** → LIFF (`liff.ts`, `withLoginOnExternalBrowser: false`) → `POST /api/auth/line/liff`
- ถ้า LIFF หลุดมา `/callback` หน้า callback จะต่อ `loginTmp` ให้จบก่อน แล้วค่อยถือเป็น error ของเว็บ OAuth
- Backend แลก token แล้ว verify `id_token` จากนั้น upsert user และออก JWT ของแอป (`LineAuthService`)

**API ของเราที่ห่อไว้**

- `POST /api/auth/line` — body `{ "code": "..." }`
- `POST /api/auth/line/liff` — body `{ "idToken", "accessToken" }` (กรณีเปิดใน LIFF)

**Env**

| ตัวแปร | ใช้ที่ |
| --- | --- |
| `VITE_LINE_CHANNEL_ID` | Front — `client_id` ของ authorize URL |
| `VITE_LINE_REDIRECT_URI` | Front — callback ของเว็บ (`{origin}/callback`) |
| `VITE_LIFF_ID` | Front — ใช้ LIFF เฉพาะในแอป LINE |
| `LINE_CLIENT_ID` | user-service |
| `LINE_CLIENT_SECRET` | user-service |
| `LINE_REDIRECT_URI` | user-service |

### 1.2 LIFF

ใช้เมื่อเปิดแอปใน LINE in-app browser (`@line/liff`)

- Front: `Front/lineapp/src/lib/liff.ts` — `liff.init({ withLoginOnExternalBrowser: false })` แล้วใช้ LIFF เฉพาะ `liff.isInClient()`
- `liff.login` กลับที่ `{origin}/` (ต้องลงทะเบียนใน Callback URL) ไม่ใช้ URL หน้าปัจจุบันที่มี query
- Backend ใช้ `LINE_LIFF_URL` เป็น base URL ของปุ่มแก้ไขใน Flex Message

**Env:** `VITE_LIFF_ID`, `LINE_LIFF_URL`

### 1.3 Messaging API (Chatbot)

LINE ยิงเข้ามาที่ webhook ของเรา แล้วเราตอบกลับด้วย Reply / Push

| รายการ | ค่า |
| --- | --- |
| Webhook (inbound) | `POST /webhook` ของ user-service |
| Reply | `POST https://api.line.me/v2/bot/message/reply` |
| Push | `POST https://api.line.me/v2/bot/message/push` |
| Bot profile | `GET https://api.line.me/v2/bot/profile/{userId}` |
| Auth | `Authorization: Bearer {LINE_CHANNEL_ACCESS_TOKEN}` |
| ตรวจลายเซ็น webhook | `x-line-signature` = HMAC-SHA256(body, `LINE_CHANNEL_SECRET`) |

**Env:** `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`

Chatbot ใช้ third-party อื่นต่อด้วย เช่น พยากรณ์อากาศ (TMD) และราคาสินค้าเกษตร (NABC) แล้วให้ AI สรุปก่อนตอบ

---

## 2. กรมอุตุนิยมวิทยา — TMD NWP Forecast API

พยากรณ์อากาศตามจังหวัด / อำเภอ / ตำบล

| รายการ | ค่า |
| --- | --- |
| Base URL | `https://data.tmd.go.th/nwpapi` |
| Client | `WeatherClientService` |
| Auth | `Authorization: Bearer {WEATHER_API_TOKEN}` |
| Timeout | `WEATHER_API_TIMEOUT_SECONDS` (default 20) |

### Endpoints ที่เรียก

| Method | Path | ใช้ทำ |
| --- | --- | --- |
| GET | `/v1/forecast/location/hourly/place` | พยากรณ์รายชั่วโมง (duration 1–48, default 24) |
| GET | `/v1/forecast/location/daily/place` | พยากรณ์รายวัน (duration 1–126, default 7) |

**Query:** `province`, `amphoe`, `tambon`, `date` (`YYYY-MM-DD`), `hour` (0–23, เฉพาะ hourly), `duration`

ถ้าตำบล/อำเภอไม่เจอ จะถอยขอบเขตขึ้น (ตำบล → อำเภอ → จังหวัด)

**API ของเราที่ห่อไว้**

- `GET /api/weather/forecast`
- `GET /api/weather/forecast/daily`

ใช้ที่หน้า Home (`WeatherHero`), หน้า Weather, และ LINE เมื่อ user ทักเรื่องอากาศ

**Env:** `WEATHER_API_BASE_URL`, `WEATHER_API_TOKEN`, `WEATHER_API_TIMEOUT_SECONDS`, `WEATHER_API_DURATION_HOURS`

---

## 3. กรมอุตุนิยมวิทยา — Weather Warning News

ประกาศเตือนภัยอากาศล่าสุด (XML)

| รายการ | ค่า |
| --- | --- |
| URL | `https://data.tmd.go.th/api/WeatherWarningNews/v2/` |
| Client | `WeatherWarningService` |
| Auth | query `uid`, `ukey` |
| Response | XML (`Warning` → `TitleThai`, `DescriptionThai`, วันที่มีผล, URL ติดต่อ ฯลฯ) |
| Cache | 1 ชั่วโมง ตาม fingerprint ของประกาศ |

**API ของเราที่ห่อไว้:** `GET /api/weather/warning`

ข้อความยาวจะส่งไปให้ `ai-service` สรุปก่อนแสดงบนเว็บ / LINE

**Env:** `WEATHER_WARNING_URL`, `WEATHER_WARNING_UID`, `WEATHER_WARNING_UKEY`

ค่า default ใน `.env.example` เป็น `demo` / `demokey` — ควรเปลี่ยนเป็น credential จริงตอน production

---

## 4. NABC — ราคาสินค้าเกษตร

ข้อมูลราคาจาก [agriapi.nabc.go.th](https://agriapi.nabc.go.th) (ศูนย์ข้อมูลเกษตรแห่งชาติ)

| รายการ | ค่า |
| --- | --- |
| Base URL | `https://agriapi.nabc.go.th` |
| Client | `AgriPriceClientService` |
| Auth | ไม่มี |
| Timeout | `AGRI_PRICE_TIMEOUT_SECONDS` (default 20) |
| Pagination | ดึงได้สูงสุด `AGRI_PRICE_MAX_PAGES` หน้า (default 3) |
| Cache ชื่อสินค้า/หมวด | 1 ชั่วโมง |

### Endpoints ที่เรียก

| Method | Path | Query | ใช้ทำ |
| --- | --- | --- | --- |
| GET | `/api/daily-prices/product-names` | — | รายชื่อสินค้า (autocomplete / match) |
| GET | `/api/daily-prices/categories` | — | หมวดสินค้า |
| GET | `/api/daily-prices/product` | `product_name`, `page` | ราคารายวันตามชื่อสินค้า |
| GET | `/api/daily-prices/category` | `product_category`, `page` | ราคารายวันตามหมวด |
| GET | `/api/weekly-prices/product` | `product_name`, `page` | ราคารายสัปดาห์ |
| GET | `/api/weekly-prices/commod` | `commod`, `page` | ราคารายสัปดาห์ตาม commod |
| GET | `/api/monthly-prices/product` | `product_name`, `page` | ราคารายเดือน |
| GET | `/api/monthly-prices/commod` | `commod`, `page` | ราคารายเดือนตาม commod |

**API ของเราที่ห่อไว้**

- `GET /api/agri-prices/product-names`
- `GET /api/agri-prices/search?q=...&period=daily|weekly|monthly`

ใช้ที่หน้า Prices บนเว็บ และใน LINE เมื่อ user ทักถามราคา (AI ช่วยแกะชื่อสินค้าก่อน)

**Env:** `AGRI_PRICE_BASE_URL`, `AGRI_PRICE_TIMEOUT_SECONDS`, `AGRI_PRICE_MAX_PAGES`

---

## 5. กระทรวงสาธารณสุข — MOPH HCode

จังหวัด / อำเภอ / ตำบล สำหรับโปรไฟล์ที่อยู่ของ user

สมัครบัญชี: [hcode.moph.go.th/signup](https://hcode.moph.go.th/signup/)

| รายการ | ค่า |
| --- | --- |
| Base URL | `https://hcode.moph.go.th` |
| Client | `HCodeClientService` |
| Auth | JWT จาก login |
| Default ในโปรเจกต์ | ใช้ไฟล์ JSON ใน repo (`hcode.data-source=local`) ไม่ยิง API จนกว่าจะตั้ง `HCODE_DATA_SOURCE=remote` |

### Endpoints ที่เรียก (เมื่อ `HCODE_DATA_SOURCE=remote`)

| Method | Path | ใช้ทำ |
| --- | --- | --- |
| POST | `/api/token/` | login `{ username, password }` → `access` + `refresh` |
| POST | `/api/token/refresh/` | ต่ออายุ access token |
| GET | `/api/province/` | รายการจังหวัด (paginate `page`, `page_size`) |
| GET | `/api/district/` | อำเภอ — filter `province_code` |
| GET | `/api/subdistrict/` | ตำบล — filter `district_code` |

Access token ถูก cache ประมาณ 4 ชั่วโมง ถ้า remote พังจะ fallback ไป JSON ใน `Back/user-service/demo/src/main/resources/thai-admin/`

**API ของเราที่ห่อไว้**

- `GET /api/thai-admin/provinces`
- `GET /api/thai-admin/districts?provinceCode=`
- `GET /api/thai-admin/subdistricts?districtCode=`

**Env:** `HCODE_BASE_URL`, `HCODE_USERNAME`, `HCODE_PASSWORD`, `HCODE_DATA_SOURCE`, `HCODE_PAGE_SIZE`, `HCODE_TIMEOUT_SECONDS`

---

## 6. OpenTyphoon (LLM หลัก)

AI ของแอปเรียก LLM ผ่าน `ai-service` ไม่ยิงจาก Front โดยตรง

| รายการ | ค่า |
| --- | --- |
| Base URL | `https://api.opentyphoon.ai/v1` |
| Client | OpenAI SDK (`Back/ai-service/src/service/llm_service.py`) |
| Model | `typhoon-v2.5-30b-a3b-instruct` |
| Auth | `api_key_openai` (ส่งเป็น OpenAI `api_key`) |
| Timeout | 20 วินาที แล้ว fallback ไป ThaiLLM |

ใช้กับงาน:

- แกะข้อความบัญชี (`GET /parse`)
- สรุปประกาศเตือนภัย (`POST /weather-warning/summarize`)
- สรุพยากรณ์สั้น ๆ สำหรับ LINE (`POST /weather-brief/summarize`)
- แกะชื่อสินค้าจากข้อความ LINE (`POST /agri-price/extract`)
- สรุปแนวโน้มราคา (`POST /agri-price/summarize`)
- สรุปรอบปลูก (`POST /cycle-summary/summarize`)

**Env:** `api_key_openai`

---

## 7. ThaiLLM (LLM สำรอง)

ถ้า OpenTyphoon ล้มเหลว `ai-service` จะไล่ลำดับนี้:

1. `POST http://thaillm.or.th/api/typhoon/v1/chat/completions`
2. `POST http://thaillm.or.th/api/kbtg/v1/chat/completions`

| รายการ | ค่า |
| --- | --- |
| Auth | header `apikey: {api_key_thaillm}` |
| Body | OpenAI-style chat completions (`model: "/model"`) |
| Timeout | 20 วินาทีต่อตัว |

**Env:** `api_key_thaillm`

---

## สิ่งที่ไม่นับเป็น Third-party API

สิ่งเหล่านี้มีในโปรเจกต์แต่ไม่ใช่ API ภายนอกที่แอปเรียกเป็นประจำ:

| รายการ | เหตุผล |
| --- | --- |
| `user-service` / `ai-service` | บริการภายในของเรา |
| PostgreSQL | ฐานข้อมูลของเรา |
| หน้าติดต่อภาครัฐ | เบอร์โทร hardcoded ใน `governmentContacts.ts` ไม่มี API |
| JSON จังหวัด/อำเภอ/ตำบล ใน repo | ข้อมูล local สำรองของ HCode |
| ngrok | อุโมงค์ webhook ตอน dev ไม่ใช่ data API |
| ไอคอนอากาศ Google / QR LINE / `lin.ee` | static asset / deep link ไม่ใช่ API |

---

## แผนภาพการเรียก

```
Front (Web / LIFF)
  ├─ LINE Login authorize          → access.line.me
  └─ REST ของเรา                   → user-service
                                      ├─ LINE token / profile / reply / push
                                      ├─ TMD NWP + Weather Warning
                                      ├─ NABC agriapi
                                      ├─ MOPH HCode (optional)
                                      └─ ai-service
                                           ├─ OpenTyphoon (หลัก)
                                           └─ ThaiLLM typhoon → kbtg (สำรอง)

LINE Platform
  └─ Webhook POST /webhook         → user-service
```
