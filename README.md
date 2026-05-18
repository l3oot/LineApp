# LineApp

แอป LINE LIFF สำหรับจดบันทึกรายรับ-รายจ่ายของเกษตรกร พร้อมระบบ AI ช่วยแยกข้อมูลจากข้อความปกติของผู้ใช้

## โครงสร้างโปรเจค

```
LineApp/
├── docker-compose.yml          # รวมทั้ง stack
├── .env.example                # ตัวอย่าง env (Postgres / Docs / CORS / Vite)
├── Front/
│   └── lineapp/                # React + Vite + Tailwind
└── Back/
    ├── user-service/demo/      # Spring Boot — CRUD + LINE Auth + JWT
    └── ai-service/             # FastAPI — LLM extract transaction
```

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind + react-aria-components + Chart.js
- **User Service**: Spring Boot 4 + Spring Security + JPA + PostgreSQL + JWT
- **AI Service**: FastAPI + Pydantic + Typhoon/OpenTyphoon LLM
- **Database**: PostgreSQL (รันบนเครื่อง host)
- **Deploy**: Docker Compose

## วิธีรัน (Docker)

```powershell
# 1. คัดลอก env ตัวอย่าง แล้วแก้ค่าตามเครื่อง
Copy-Item .env.example .env

# 2. รันทั้ง stack
docker compose up -d --build
```

หลังขึ้น:
- Frontend: <http://localhost:5173>
- User Service API: <http://localhost:8080>
- Swagger UI (HTTP Basic): <http://localhost:8080/api/docs> (default `admin` / `admin`)
- AI Service: <http://localhost:8000>

## วิธีรันแบบ dev บน host

### Frontend
```powershell
cd Front/lineapp
npm install
npm run dev
```

### User Service
```powershell
cd Back/user-service/demo
./mvnw spring-boot:run
```

### AI Service
```powershell
cd Back/ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

## Env ที่ต้องตั้ง

แต่ละ service มี `.env` ของตัวเอง (ดูตัวอย่างใน `.env.example` ที่ root):

- `Back/user-service/demo/.env` — LINE OAuth (`LINE_CLIENT_ID`, `LINE_CLIENT_SECRET`, `LINE_REDIRECT_URI`), JWT (`JWT_SECRET`, `JWT_EXPIRATION`), Spring Security docs (`DOCS_USERNAME`, `DOCS_PASSWORD`), CORS (`APP_CORS_ALLOWED_ORIGINS`)
- `Back/ai-service/.env` — LLM API keys (`OPENTYPHOON_API_KEY` ฯลฯ), `LINEAPP_API_BASE`
- `Front/lineapp/.env` — `VITE_API_BASE_URL`, `VITE_LINE_CHANNEL_ID`, `VITE_LINE_REDIRECT_URI`

> `.env` ทั้งหมดถูก ignore โดย git แล้ว ดูค่าที่จำเป็นได้จาก `.env.example` ในแต่ละโฟลเดอร์

## License

Private
